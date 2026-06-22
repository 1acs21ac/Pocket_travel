import { getDb } from './db.js'

export async function findUserByOpenid(openid) {
  const [rows] = await getDb().query('SELECT * FROM users WHERE openid = ? LIMIT 1', [openid])
  return rows[0] || null
}

export async function createUser({ openid, nickname = '旅行搭子', avatarUrl = '' }) {
  const [result] = await getDb().query(
    'INSERT INTO users (openid, nickname, avatar_url) VALUES (?, ?, ?)',
    [openid, nickname, avatarUrl]
  )
  return { id: result.insertId, openid, nickname, avatarUrl }
}

export async function findUserById(userId) {
  const [rows] = await getDb().query(
    'SELECT id, openid, nickname, avatar_url, interest_tags_json, created_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  )
  return rows[0] || null
}

export async function updateUserInterestTags(userId, interestTags) {
  const [rows] = await getDb().query(
    'UPDATE users SET interest_tags_json = ? WHERE id = ?',
    [JSON.stringify(interestTags), userId]
  )
  return { id: userId, interest_tags_json: JSON.stringify(interestTags) }
}

export async function updateUserAvatar(userId, nickname, avatarUrl) {
  if (!nickname && !avatarUrl) return
  const fields = []
  const values = []
  if (nickname !== undefined) {
    fields.push('nickname = ?')
    values.push(nickname)
  }
  if (avatarUrl !== undefined) {
    fields.push('avatar_url = ?')
    values.push(avatarUrl)
  }
  values.push(userId)
  await getDb().query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
}
