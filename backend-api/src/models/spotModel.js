import { getDb } from './db.js'
import { createNotificationTx } from './notificationModel.js'

function toJson(value, fallback) {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
  return value
}

function normalizeComment(row) {
  const images = toJson(row.images_json, [])
  const tags = toJson(row.tags_json, [])
  const moodTags = toJson(row.mood_tags_json, [])
  return {
    ...row,
    images: Array.isArray(images) ? images : [],
    tags: Array.isArray(tags) ? tags : [],
    moodTags: Array.isArray(moodTags) ? moodTags : []
  }
}

function matchesProfile(comment, profileTags) {
  if (profileTags.length === 0 || comment.images.length === 0) return false
  const metadata = [...comment.tags, ...comment.moodTags]
  return profileTags.some((tag) => metadata.some((value) => value.includes(tag) || tag.includes(value)))
}

function byLikesAndTime(left, right) {
  const likeDiff = Number(right.like_count || 0) - Number(left.like_count || 0)
  if (likeDiff !== 0) return likeDiff
  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
}

function sortComments(rows, profileTags) {
  const comments = rows.map(normalizeComment)
  const matching = comments.filter((comment) => matchesProfile(comment, profileTags)).sort(byLikesAndTime)
  const priority = matching.slice(0, 3)
  const priorityIds = new Set(priority.map((comment) => comment.id))
  const remaining = comments.filter((comment) => !priorityIds.has(comment.id)).sort(byLikesAndTime)
  return [...priority, ...remaining]
}

const OFFICIAL_COMMENT_IMAGES = ['official-spot-guide-1.jpg', 'official-spot-guide-2.jpg']

export function buildOfficialComments(spotId) {
  return [
    {
      id: `official-${spotId}-1`,
      user_id: 0,
      rating: 5,
      content: '官方精选：建议下午抵达，光线柔和，适合拍照和慢逛。',
      images_json: JSON.stringify(OFFICIAL_COMMENT_IMAGES),
      tags_json: JSON.stringify(['官方精选', '拍照出片']),
      mood_tags_json: JSON.stringify(['放松', '安静']),
      like_count: 50,
      created_at: '2026-05-01T00:00:00.000Z'
    }
  ]
}

export async function getSpotById(spotId) {
  const [rows] = await getDb().query('SELECT * FROM spots WHERE id = ? LIMIT 1', [spotId])
  return rows[0] || null
}

export async function getSpotList() {
  const [rows] = await getDb().query(
    'SELECT id, name, lat, lng, detail_json, created_at FROM spots ORDER BY id DESC LIMIT 100'
  )
  return rows
}

export async function createCheckin({ userId, spotId, distanceMeter, photos, dryTags, content }) {
  const [result] = await getDb().query(
    `INSERT INTO checkins (user_id, spot_id, distance_meter, photos_json, dry_tags_json, content)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, spotId, distanceMeter, JSON.stringify(photos), JSON.stringify(dryTags), content || '']
  )
  return result.insertId
}

export async function countTodayCheckin(userId, spotId) {
  const [rows] = await getDb().query(
    `SELECT COUNT(1) AS c
     FROM checkins
     WHERE user_id = ?
       AND spot_id = ?
       AND DATE(created_at) = CURDATE()`,
    [userId, spotId]
  )
  return Number(rows[0]?.c || 0)
}

export async function createComment({ userId, spotId, rating, content, images, tags = [], moodTags = [] }) {
  const [result] = await getDb().query(
    `INSERT INTO comments (user_id, spot_id, rating, content, images_json, tags_json, mood_tags_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, spotId, rating, content, JSON.stringify(images || []), JSON.stringify(tags), JSON.stringify(moodTags)]
  )
  return result.insertId
}

export async function countTodayComment(userId, spotId) {
  const [rows] = await getDb().query(
    `SELECT COUNT(1) AS c
     FROM comments
     WHERE user_id = ?
       AND spot_id = ?
       AND DATE(created_at) = CURDATE()`,
    [userId, spotId]
  )
  return Number(rows[0]?.c || 0)
}

export async function getComments(spotId, { profileTags = [] } = {}) {
  const [rows] = await getDb().query(
    `SELECT id, user_id, rating, content, images_json, tags_json, mood_tags_json, like_count, created_at
     FROM comments
     WHERE spot_id = ?
     ORDER BY created_at DESC`,
    [spotId]
  )
  return sortComments(rows, profileTags)
}

export async function likeCommentTx(connection, { userId, spotId, commentId }) {
  const [commentRows] = await connection.query(
    `SELECT id, user_id, like_count
     FROM comments
     WHERE id = ? AND spot_id = ?
     LIMIT 1`,
    [commentId, spotId]
  )
  const comment = commentRows[0]
  if (!comment) return null

  const [likeResult] = await connection.query(
    `INSERT IGNORE INTO comment_likes (user_id, comment_id) VALUES (?, ?)`,
    [userId, commentId]
  )
  if (likeResult.affectedRows === 0) return { like_count: comment.like_count }

  const [updatedRows] = await connection.query(
    `UPDATE comments SET like_count = like_count + 1 WHERE id = ? AND spot_id = ?`,
    [commentId, spotId]
  )

  if (Number(comment.user_id) !== Number(userId)) {
    await createNotificationTx(connection, {
      recipientUserId: comment.user_id,
      actorUserId: userId,
      notificationType: 'comment_like',
      title: '你的评论收到点赞',
      content: '有人点赞了你的景点评论',
      payload: { spotId, commentId },
      dedupeKey: `comment_like:${commentId}:${userId}`
    })
  }

  return updatedRows[0] || { like_count: comment.like_count + 1 }
}

export async function incrementCommentLike({ spotId, commentId }) {
  const [rows] = await getDb().query(
    `UPDATE comments SET like_count = like_count + 1 WHERE id = ? AND spot_id = ?`,
    [commentId, spotId]
  )
  return rows[0] || null
}

export async function favoriteSpot(userId, spotId) {
  const [result] = await getDb().query(
    `INSERT IGNORE INTO spot_favorites (user_id, spot_id) VALUES (?, ?)`,
    [userId, spotId]
  )
  return result.affectedRows > 0 ? { id: result.insertId } : null
}

export async function getSpotFromRouteStops(spotId) {
  const [rows] = await getDb().query(
    `SELECT id, spot_id, detail_json, title, lat, lng FROM route_stops WHERE spot_id = ? LIMIT 1`,
    [Number(spotId)]
  )
  if (!rows[0]) return null
  const stop = rows[0]
  const detail = toJson(stop.detail_json, {})
  return {
    id: Number(stop.spot_id),
    name: stop.title || detail.name || '途径点',
    lat: Number(stop.lat) || 0,
    lng: Number(stop.lng) || 0,
    detail_json: stop.detail_json,
    ...detail
  }
}

export async function ensureSpotExists(spotId) {
  let spot = await getSpotById(spotId)
  if (spot) return spot
  const routeStop = await getSpotFromRouteStops(spotId)
  if (routeStop) return routeStop
  return {
    id: Number(spotId),
    name: '途径点',
    lat: 0,
    lng: 0,
    detail_json: '{}',
    images: [],
    description: '该景点信息暂未收录，你可以成为第一个打卡的人！',
    openTime: '全天开放',
    ticketInfo: '免费',
    reservationTip: '无需预约',
    address: '地址待补充',
    weather: { condition: '晴', temp: 22 },
    crowdLevel: '一般'
  }
}

export async function updateSpotAddress(spotId, address) {
  const spot = await getSpotById(spotId)
  if (!spot) return null
  
  const detail = toJson(spot.detail_json, {})
  detail.address = address
  
  await getDb().query(
    'UPDATE spots SET detail_json = ? WHERE id = ?',
    [JSON.stringify(detail), spotId]
  )
  
  return { ...spot, detail_json: JSON.stringify(detail), address }
}
