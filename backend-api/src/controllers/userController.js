import { ok } from '../utils/response.js'
import { BizError } from '../utils/errors.js'
import { requireFields } from '../utils/validate.js'
import { findUserById, updateUserInterestTags, updateUserAvatar } from '../models/userModel.js'

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

export async function getUserProfile(ctx) {
  const userId = ctx.state.user.userId
  const user = await findUserById(userId)
  if (!user) throw new BizError(10001, '用户不存在')
  ok(ctx, {
    id: user.id,
    openid: user.openid,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    interestTags: toJson(user.interest_tags_json, []),
    createdAt: user.created_at
  })
}

export async function updateUserProfile(ctx) {
  const userId = ctx.state.user.userId
  const { nickname, avatarUrl, interestTags } = ctx.request.body

  // 更新昵称和头像
  if (nickname !== undefined || avatarUrl !== undefined) {
    await updateUserAvatar(userId, nickname, avatarUrl)
  }

  // 更新兴趣标签
  if (interestTags !== undefined) {
    if (!Array.isArray(interestTags)) throw new BizError(10001, '参数错误: interestTags 必须为数组')
    await updateUserInterestTags(userId, interestTags)
  }

  ok(ctx, { success: true })
}
