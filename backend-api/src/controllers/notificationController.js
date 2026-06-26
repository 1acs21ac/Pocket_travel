import { getDb } from '../models/db.js'
import { ok } from '../utils/response.js'

export async function getNotifications(ctx) {
  const userId = ctx.state.user.userId
  const db = getDb()
  
  const [rows] = await db.query(
    `SELECT id, notification_type AS type, title, content, payload_json, 
            read_at AS readAt, created_at AS createdAt
     FROM notifications
     WHERE recipient_user_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  )
  
  const list = rows.map(row => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.content,
    payload: row.payload_json ? JSON.parse(row.payload_json) : {},
    isRead: Boolean(row.readAt),
    createdAt: row.createdAt
  }))
  
  const [unreadCount] = await db.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE recipient_user_id = ? AND read_at IS NULL',
    [userId]
  )
  
  ok(ctx, { list, unreadCount: unreadCount[0]?.count || 0 })
}

export async function markAsRead(ctx) {
  const userId = ctx.state.user.userId
  const { id } = ctx.params
  const db = getDb()
  
  await db.query(
    'UPDATE notifications SET read_at = NOW() WHERE id = ? AND recipient_user_id = ?',
    [id, userId]
  )
  
  ok(ctx, { success: true })
}

export async function markAllRead(ctx) {
  const userId = ctx.state.user.userId
  const db = getDb()
  
  await db.query(
    'UPDATE notifications SET read_at = NOW() WHERE recipient_user_id = ? AND read_at IS NULL',
    [userId]
  )
  
  ok(ctx, { success: true })
}
