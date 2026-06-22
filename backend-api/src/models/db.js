import mysql from 'mysql2/promise'
import { logger } from '../utils/logger.js'

let pool

export async function initDb() {
  const dbName = process.env.DB_NAME
  const host = process.env.DB_HOST || '127.0.0.1'
  const port = Number(process.env.DB_PORT || 3306)
  const user = process.env.DB_USER || 'root'
  const password = process.env.DB_PASSWORD || ''

  try {
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      namedPlaceholders: false
    })
    await pool.query('SELECT 1')
  } catch (error) {
    await closePool()
    // Try to create database if it doesn't exist
    const bootstrapPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database: process.env.DB_BOOTSTRAP_DATABASE || undefined,
      waitForConnections: true,
      connectionLimit: 2
    })
    try {
      await bootstrapPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``)
      logger.info(`Database ${dbName} created (or already exists)`)
    } finally {
      await bootstrapPool.end()
    }
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })
    await pool.query('SELECT 1')
  }

  await ensureSchema()
  logger.info('MySQL connected and schema ensured')
}

export function getDb() {
  if (!pool) {
    throw new Error('Database not initialized')
  }
  return {
    query: async (sql, params = []) => {
      const [rows] = await pool.query(sql, params)
      return [rows]
    },
    getConnection: async () => {
      const connection = await pool.getConnection()
      return {
        beginTransaction: async () => connection.beginTransaction(),
        commit: async () => connection.commit(),
        rollback: async () => connection.rollback(),
        query: async (sql, params = []) => {
          const [rows] = await connection.query(sql, params)
          return [rows]
        },
        release: () => connection.release()
      }
    }
  }
}

async function ensureSchema() {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const schemaPath = path.resolve(import.meta.dirname, './schema.sql')
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8')

  const statements = schemaSql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    if (!statement) continue
    try {
      await pool.query(statement)
    } catch (error) {
      // Ignore "table already exists" and "index already exists" errors
      if (
        error.code !== 'ER_TABLE_EXISTS_ERROR' &&
        error.code !== 'ER_DUP_KEYNAME' &&
        error.code !== 'ER_FK_DUP_NAME'
      ) {
        logger.warn(`Schema statement warning: ${error.message}`)
      }
    }
  }
}

async function closePool() {
  if (!pool) return
  await pool.end()
  pool = undefined
}
