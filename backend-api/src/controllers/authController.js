import { requireFields } from '../utils/validate.js'
import { code2Session } from '../utils/wechat.js'
import { createUser, findUserByOpenid, updateUserAvatar } from '../models/userModel.js'
import { ensureBeanAccount } from '../models/beanModel.js'
import { signToken } from '../utils/jwt.js'
import { ok } from '../utils/response.js'

export async function wechatLogin(ctx) {
  requireFields(ctx.request.body, ['code'])
  const { code, nickname, avatarUrl } = ctx.request.body

  const session = await code2Session(code)
  let user = await findUserByOpenid(session.openid)
  let isNewUser = false

  if (!user) {
    // 新用户：使用传入的昵称和头像，或使用默认值
    user = await createUser({
      openid: session.openid,
      nickname: nickname || '旅行搭子',
      avatarUrl: avatarUrl || ''
    })
    isNewUser = true
  } else {
    // 已注册用户同步头像和昵称（如果传入的话）
    if (nickname || avatarUrl) {
      await updateUserAvatar(user.id, nickname, avatarUrl)
      // 更新 user 对象中的值
      user.nickname = nickname || user.nickname
      user.avatar_url = avatarUrl || user.avatar_url
    }
  }

  await ensureBeanAccount(user.id)
  const token = signToken({ userId: user.id, openid: session.openid })

  ok(ctx, {
    token,
    openid: session.openid,
    userId: user.id,
    isNewUser,
    nickname: user.nickname,
    avatar: user.avatar_url
  })
}
