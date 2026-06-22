import jwt from 'jsonwebtoken'
import { BizError } from './errors.js'

const secret = process.env.JWT_SECRET || 'dev-secret'
const expiresIn = process.env.JWT_EXPIRES_IN || '7d'

export function signToken(payload) {
  return jwt.sign(payload, secret, { expiresIn })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, secret)
  } catch {
    throw new BizError(10002, '未登录或鉴权失败')
  }
}
