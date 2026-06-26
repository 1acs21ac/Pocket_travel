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
    user = await createUser({
      openid: session.openid,
      nickname: nickname || '旅行搭子',
      avatarUrl: avatarUrl || ''
    })
    isNewUser = true
  } else {
    if (nickname || avatarUrl) {
      await updateUserAvatar(user.id, nickname, avatarUrl)
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
