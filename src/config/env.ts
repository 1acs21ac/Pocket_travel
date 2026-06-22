const isProd = import.meta.env.PROD

// 开发阶段：设为 false 使用本地后端 127.0.0.1:3000
// 上线前：改为 true 使用服务器地址 47.116.3.23
const isProduction = false

export function resolveApiBaseUrl(forceProduction: boolean) {
  return forceProduction ? 'http://47.116.3.23' : 'http://127.0.0.1:3000'
}

export const API_BASE_URL = resolveApiBaseUrl(isProduction)

export const API_TIMEOUT = 15000
