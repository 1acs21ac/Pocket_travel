import { getStorage, removeStorage, setStorage } from './storage'
import { API_BASE_URL } from '@/config/env'
import { useUserStore } from '@/store/user'

const TOKEN_KEY = 'token'
const OPENID_KEY = 'openid'
const TOKEN_EXPIRE_AT_KEY = 'tokenExpireAt'
const NICKNAME_KEY = 'nickname'
const AVATAR_KEY = 'avatar'

export interface LoginResult {
  token: string
  openid: string
  userId?: number
  nickname?: string
  avatar?: string
}

/**
 * 鉴权状态判断：用于页面守卫或业务入口判断。
 */
export function isLoggedIn() {
  return Boolean(getStorage<string>(TOKEN_KEY))
}

/**
 * 微信登录预处理（前端侧）：
 * - 调用 uni.login 获取 code
 * - 后续应将 code 发送至后端换取 token/openid
 */
export async function getWechatLoginCode() {
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('微信登录超时，请检查网络'))
    }, 8000)

    uni.login({
      provider: 'weixin',
      success: (res) => {
        clearTimeout(timeout)
        if (!res.code) {
          reject(new Error('微信登录 code 获取失败'))
          return
        }
        resolve(res.code)
      },
      fail: (err) => {
        clearTimeout(timeout)
        reject(new Error(`微信登录失败: ${err.errMsg || '未知错误'}`))
      }
    })
  })
}

/**
 * 持久化登录态：避免每次进入小程序重复鉴权。
 */
export function saveLoginSession(payload: LoginResult) {
  const expireAt = Date.now() + 6 * 24 * 60 * 60 * 1000
  setStorage(TOKEN_KEY, payload.token)
  setStorage(OPENID_KEY, payload.openid)
  setStorage(TOKEN_EXPIRE_AT_KEY, expireAt)
  // 存储昵称和头像
  if (payload.nickname) {
    setStorage(NICKNAME_KEY, payload.nickname)
  }
  if (payload.avatar) {
    setStorage(AVATAR_KEY, payload.avatar)
  }
  const userStore = useUserStore()
  userStore.setProfile({
    openid: payload.openid,
    nickname: payload.nickname,
    avatar: payload.avatar
  })
  userStore.setAuth({ token: payload.token, expireAt })
}

export function clearLoginSession() {
  removeStorage(TOKEN_KEY)
  removeStorage(OPENID_KEY)
  removeStorage(TOKEN_EXPIRE_AT_KEY)
}

/**
 * 微信登录换票：
 * - 登录接口不带 token，直接用 uni.request 避免 request ↔ auth 循环依赖
 * - 后端路径与文档一致：POST /api/v1/auth/login
 */
export async function wechatLogin() {
  const code = await getWechatLoginCode()

  const loginData = await new Promise<LoginResult>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}/api/v1/auth/login`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      timeout: 15000,
      data: { code },
      success: (res: any) => {
        const data = res.data as { code: number; message: string; data: LoginResult }
        if (res.statusCode !== 200 || !data || data.code !== 0) {
          reject(new Error(data?.message || `登录失败 (${res.statusCode})`))
          return
        }
        resolve(data.data)
      },
      fail: (err: any) => {
        reject(new Error(`登录请求失败: ${err.errMsg || '网络异常'}`))
      }
    })
  })

  saveLoginSession(loginData)
  return loginData
}

export function isTokenExpired() {
  const expireAt = Number(getStorage<number>(TOKEN_EXPIRE_AT_KEY) || 0)
  if (!expireAt) return true
  return Date.now() >= expireAt
}

/**
 * token 续期策略：
 * - 本期后端无 refresh-token 接口，采用微信静默登录重拿 token
 * - 确保请求遇到 10002 时可恢复
 */
export async function refreshAuthToken() {
  await wechatLogin()
}
