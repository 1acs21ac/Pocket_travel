import { ok } from '../utils/response.js'
import { requireFields } from '../utils/validate.js'
import { BizError } from '../utils/errors.js'
import { calculateDistanceMeter, checkGpsWithin500Meter } from '../utils/gps.js'
import {
  createCheckin,
  createComment,
  favoriteSpot,
  getComments,
  ensureSpotExists,
  getSpotList,
  likeCommentTx
} from '../models/spotModel.js'
import { beanRule, clampBeanBalance } from '../utils/beanRule.js'
import { getDb } from '../models/db.js'
import { addBeanLog, claimDailyRewardTx, getBeanBalanceTx, updateBeanBalanceTx } from '../models/beanModel.js'
import { getMoodProfile } from '../models/moodModel.js'
import { createNotificationTx } from '../models/notificationModel.js'
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

function normalizeSpotDetail(spot, comments = []) {
  const detail = toJson(spot.detail_json, {})
  return {
    ...spot,
    spotId: spot.id,
    images: detail.images || [],
    description: detail.description || spot.description || '',
    openTime: detail.openTime || '全天开放',
    ticketInfo: detail.ticketInfo || '免费',
    reservationTip: detail.reservationTip || '无需预约',
    weather: detail.weather || { condition: '晴', temp: 22 },
    crowdLevel: detail.crowdLevel || '一般',
    address: detail.address || '地址待补充',
    coordinates: { lat: Number(spot.lat), lng: Number(spot.lng) },
    comments
  }
}

async function resolveSpot(spotId) {
  const spot = await ensureSpotExists(spotId)
  if (!spot) throw new BizError(10001, '景点不存在')
  return spot
}

export async function getSpotDetail(ctx) {
  const spot = await resolveSpot(Number(ctx.params.spotId))
  const comments = await getComments(spot.id)
  ok(ctx, normalizeSpotDetail(spot, comments))
}

export async function listSpots(ctx) {
  const list = await getSpotList()
  ok(ctx, { list })
}

export async function createSpotCheckin(ctx) {
  const userId = ctx.state.user.userId
  const spotId = Number(ctx.params.spotId)
  requireFields(ctx.request.body, ['lat', 'lng', 'photos', 'dryTags'])
  const { lat, lng, photos, dryTags, content = '' } = ctx.request.body

  const spot = await resolveSpot(spotId)
  if (!Array.isArray(photos) || photos.length < 1 || photos.length > 3) {
    throw new BizError(10001, '参数错误: photos 必须为1到3张')
  }
  if (!Array.isArray(dryTags) || dryTags.length < 1) {
    throw new BizError(10001, '参数错误: dryTags 必填')
  }

  const distanceMeter = Math.round(calculateDistanceMeter(lat, lng, spot.lat, spot.lng))
  if (!checkGpsWithin500Meter(distanceMeter)) {
    throw new BizError(50001, '你离景点还有点远哦,到达后再打卡吧', { distanceMeter })
  }

  const checkinId = await createCheckin({ userId, spotId: spot.id, distanceMeter, photos, dryTags, content })

  let rewardBeans = 0
  const connection = await getDb().getConnection()
  try {
    await connection.beginTransaction()
    const claimed = await claimDailyRewardTx(connection, {
      userId,
      rewardType: 'checkin',
      targetType: 'spot',
      targetId: spot.id
    })
    const balance = await getBeanBalanceTx(connection, userId, { lock: true })
    const nextBalance = claimed ? clampBeanBalance(balance + beanRule.checkinReward) : balance
    rewardBeans = nextBalance - balance
    if (rewardBeans > 0) {
      await updateBeanBalanceTx(connection, userId, nextBalance)
      await addBeanLog(connection, { userId, delta: rewardBeans, reason: '打卡奖励' })
      await createNotificationTx(connection, {
        recipientUserId: userId,
        notificationType: 'checkin_reward',
        title: '豆子到账',
        content: `你完成了景点打卡，已获得${rewardBeans}豆子。`,
        payloadData: { checkinId, rewardBeans, spotId: spot.id, spotName: spot.name }
      })
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  ok(ctx, { checkinId, distanceMeter, rewardBeans, rewardGranted: rewardBeans > 0 })
}

export async function createSpotComment(ctx) {
  const userId = ctx.state.user.userId
  const spotId = Number(ctx.params.spotId)
  requireFields(ctx.request.body, ['rating', 'content'])
  const { rating, content, images = [], tags = [], moodTags = [] } = ctx.request.body
  const spot = await resolveSpot(spotId)
  if (Number(rating) < 1 || Number(rating) > 5) {
    throw new BizError(10001, '参数错误: rating 必须在1到5之间')
  }
  if (String(content).length > 200) {
    throw new BizError(10001, '参数错误: content 最多200字')
  }
  const commentId = await createComment({ userId, spotId: spot.id, rating, content, images, tags, moodTags })

  let rewardBeans = 0
  const connection = await getDb().getConnection()
  try {
    await connection.beginTransaction()
    const claimed = await claimDailyRewardTx(connection, {
      userId,
      rewardType: 'comment',
      targetType: 'spot',
      targetId: spot.id
    })
    const balance = await getBeanBalanceTx(connection, userId, { lock: true })
    const nextBalance = claimed ? clampBeanBalance(balance + beanRule.commentReward) : balance
    rewardBeans = nextBalance - balance
    if (rewardBeans > 0) {
      await updateBeanBalanceTx(connection, userId, nextBalance)
      await addBeanLog(connection, { userId, delta: rewardBeans, reason: '评论奖励' })
      await createNotificationTx(connection, {
        recipientUserId: userId,
        notificationType: 'comment_reward',
        title: '豆子到账',
        content: `你完成了评论，已获得${rewardBeans}豆子。`,
        payloadData: { commentId, rewardBeans, spotId: spot.id, spotName: spot.name }
      })
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  ok(ctx, { commentId, rewardBeans, rewardGranted: rewardBeans > 0 })
}

export async function listSpotComments(ctx) {
  const userId = ctx.state.user.userId
  const spotId = Number(ctx.params.spotId)
  const profile = await getMoodProfile(userId)
  const profileTags = toJson(profile?.mood_tags_json, [])
  const comments = await getComments(spotId, { profileTags })
  ok(ctx, { list: comments })
}

export async function likeSpotComment(ctx) {
  const userId = ctx.state?.user?.userId ?? 0
  const spotId = Number(ctx.params.spotId)
  const commentId = Number(ctx.params.commentId)
  const connection = await getDb().getConnection()
  try {
    await connection.beginTransaction()
    const result = await likeCommentTx(connection, { userId, spotId, commentId })
    if (!result) throw new BizError(10001, '评论不存在')
    await connection.commit()
    ok(ctx, { commentId, likeCount: result.like_count })
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function markSpotFavorite(ctx) {
  const userId = ctx.state.user.userId
  const spotId = Number(ctx.params.spotId)
  await resolveSpot(spotId)
  await favoriteSpot(userId, spotId)
  ok(ctx, { spotId, favorited: true })
}
