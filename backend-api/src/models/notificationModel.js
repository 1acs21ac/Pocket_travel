export async function createNotificationTx(connection, payload) {
  const {
    recipientUserId,
    actorUserId = null,
    notificationType,
    title,
    content = '',
    payload: payloadData = {},
    dedupeKey
  } = payload

  const notificationPayload = dedupeKey ? { ...payloadData, dedupeKey } : payloadData

  if (dedupeKey) {
    const [existingRows] = await connection.query(
      `SELECT id
       FROM notifications
       WHERE recipient_user_id = ?
         AND notification_type = ?
         AND JSON_EXTRACT(payload_json, '$.dedupeKey') = ?
       LIMIT 1`,
      [recipientUserId, notificationType, dedupeKey]
    )
    if (existingRows[0]) return existingRows[0]
  }

  const [result] = await connection.query(
    `INSERT INTO notifications (recipient_user_id, actor_user_id, notification_type, title, content, payload_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [recipientUserId, actorUserId, notificationType, title, content, JSON.stringify(notificationPayload)]
  )
  return { id: result.insertId }
}
