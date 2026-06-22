import { getDb } from './db.js'

function toJsonParam(value) {
  if (value === null || value === undefined) return null
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export async function createShareRecord({ userId, shareType, targetId, shareCode, metadataJson = null, checkinId = null }) {
  const [result] = await getDb().query(
    `INSERT INTO share_records (user_id, share_type, target_id, share_code, metadata_json, checkin_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, shareType, targetId, shareCode, toJsonParam(metadataJson), checkinId]
  )
  return { id: result.insertId }
}

export async function getShareRecordByCode(code) {
  const [rows] = await getDb().query('SELECT * FROM share_records WHERE share_code = ? LIMIT 1', [code])
  return rows[0] || null
}
