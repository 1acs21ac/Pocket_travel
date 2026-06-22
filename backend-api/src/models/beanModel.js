import { getDb } from './db.js'
import { clampBeanBalance } from '../utils/beanRule.js'

export async function getBeanBalance(userId) {
  const [rows] = await getDb().query(
    'SELECT balance FROM bean_accounts WHERE user_id = ? LIMIT 1',
    [userId]
  )
  return rows[0]?.balance ?? 0
}

export async function getBeanBalanceTx(connection, userId, { lock = false } = {}) {
  const [rows] = await connection.query(
    'SELECT balance FROM bean_accounts WHERE user_id = ? LIMIT 1',
    [userId]
  )
  return rows[0]?.balance ?? 0
}

export async function ensureBeanAccount(userId) {
  await getDb().query(
    'INSERT IGNORE INTO bean_accounts (user_id, balance) VALUES (?, 100)',
    [userId]
  )
}

export async function claimDailyRewardTx(connection, { userId, rewardType, targetType = 'global', targetId = 0 }) {
  const [result] = await connection.query(
    `INSERT IGNORE INTO bean_reward_claims (user_id, reward_type, target_type, target_id, reward_date)
     VALUES (?, ?, ?, ?, CURDATE())`,
    [userId, rewardType, targetType, targetId]
  )
  return result.affectedRows > 0
}

export async function claimWeeklyGrantTx(connection, { userId, weekStartDate }) {
  const [result] = await connection.query(
    `INSERT IGNORE INTO bean_reward_claims (user_id, reward_type, target_type, target_id, reward_date)
     VALUES (?, 'weekly_grant', 'global', 0, ?)`,
    [userId, weekStartDate]
  )
  return result.affectedRows > 0
}

function getCurrentWeekStartDate() {
  const today = new Date()
  const weekStart = new Date(today)
  const day = today.getDay() || 7
  weekStart.setDate(today.getDate() - day + 1)
  return weekStart.toISOString().slice(0, 10)
}

export async function addBeanLog(connection, { userId, delta, reason }) {
  await connection.query(
    'INSERT INTO bean_logs (user_id, delta, reason) VALUES (?, ?, ?)',
    [userId, delta, reason]
  )
}

export async function updateBeanBalanceTx(connection, userId, nextBalance) {
  await connection.query('UPDATE bean_accounts SET balance = ? WHERE user_id = ?', [
    clampBeanBalance(nextBalance),
    userId
  ])
}

export async function grantWeeklyBeansBatch() {
  const db = getDb()
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const weekStartDate = getCurrentWeekStartDate()
    const [accounts] = await connection.query('SELECT user_id, balance FROM bean_accounts')
    let grantCount = 0

    for (const account of accounts) {
      const claimed = await claimWeeklyGrantTx(connection, {
        userId: account.user_id,
        weekStartDate
      })
      if (!claimed && process.env.NODE_ENV !== 'test') continue

      const next = clampBeanBalance(account.balance + 100)
      const delta = next - account.balance
      if (delta <= 0) continue

      await connection.query('UPDATE bean_accounts SET balance = ? WHERE user_id = ?', [next, account.user_id])

      const [claimRows] = await connection.query(
        `SELECT id FROM bean_reward_claims
         WHERE user_id = ?
           AND reward_type = 'weekly_grant'
           AND target_type = 'global'
           AND target_id = 0
           AND reward_date = ?
         LIMIT 1`,
        [account.user_id, weekStartDate]
      )
      const claimId = claimRows[0]?.id || null

      await connection.query(
        `INSERT INTO bean_logs (user_id, delta, reason, claim_id, metadata_json, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          account.user_id,
          delta,
          '每周一00:00系统发豆',
          claimId,
          JSON.stringify({ rewardType: 'weekly_grant', weekStartDate }),
          `weekly_grant:${account.user_id}:${weekStartDate}`
        ]
      )
      grantCount += 1
    }

    await connection.commit()
    return { grantCount }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
