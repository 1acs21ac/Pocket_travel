<template>
  <view class="login-page">
    <view class="login-card">
      <text class="app-name">口袋旅行搭子</text>
      <text class="app-slogan">发现专属你的疗愈路线</text>

      <view class="mascot">🧳</view>

      <button
        class="wechat-btn"
        :loading="loading"
        :disabled="loading"
        open-type="getUserProfile"
        lang="zh_CN"
        @getuserprofile="handleGetUserProfile"
        @tap="handleTap"
      >
        <text class="btn-icon">微信</text>
        <text class="btn-text">{{ loading ? '登录中...' : '微信一键登录' }}</text>
      </button>

      <text v-if="errorMsg" class="error-tip">{{ errorMsg }}</text>

      <view class="tips">
        <text class="tip">登录即表示同意</text>
        <text class="link">《用户协议》</text>
        <text class="tip">和</text>
        <text class="link">《隐私政策》</text>
      </view>
    </view>

    <view class="decoration">
      <view class="circle c1"></view>
      <view class="circle c2"></view>
      <view class="circle c3"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { isLoggedIn, isTokenExpired, saveLoginSession } from '@/utils/auth'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const loading = ref(false)
const errorMsg = ref('')

interface UserInfo {
  nickName: string
  avatarUrl: string
}

// 用于存储从 button 获取的用户信息
let pendingUserInfo: UserInfo | null = null

// 备用点击处理 - 使用 uni.getUserProfile
async function handleTap() {
  loading.value = true
  errorMsg.value = ''
  
  try {
    // 使用 uni.getUserProfile 获取用户信息
    const profileResult = await new Promise<UniApp.GetUserProfileSuccessCallbackResult>((resolve, reject) => {
      uni.getUserProfile({
        desc: '用于完善用户资料',
        lang: 'zh_CN',
        success: resolve,
        fail: reject
      })
    })
    
    pendingUserInfo = {
      nickName: profileResult.userInfo.nickName || '',
      avatarUrl: profileResult.userInfo.avatarUrl || ''
    }
    
    // 获取微信登录 code
    const code = await doLogin()
    
    // 调用后端登录接口
    await wechatLoginWithCode(code, pendingUserInfo)
    
    uni.switchTab({ url: '/pages/explore/explore' })
  } catch (error: any) {
    // 用户取消或拒绝授权
    if (error.errMsg && error.errMsg.includes('cancel')) {
      errorMsg.value = ''
    } else {
      errorMsg.value = error instanceof Error ? error.message : '登录失败，请重试'
    }
  } finally {
    loading.value = false
    pendingUserInfo = null
  }
}

async function handleGetUserProfile(e: any) {
  loading.value = true
  errorMsg.value = ''

  try {
    // 从事件中获取用户信息
    const userInfo = e.detail?.userInfo as UserInfo | undefined

    if (!userInfo) {
      // 如果用户拒绝授权，使用空字符串
      pendingUserInfo = { nickName: '', avatarUrl: '' }
    } else {
      pendingUserInfo = userInfo
    }

    // 获取微信登录 code
    const code = await doLogin()

    // 调用后端登录接口
    await wechatLoginWithCode(code, pendingUserInfo)

    uni.switchTab({ url: '/pages/explore/explore' })
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '登录失败，请重试'
  } finally {
    loading.value = false
    pendingUserInfo = null
  }
}

function doLogin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('微信登录超时，请检查网络')), 8000)
    uni.login({
      provider: 'weixin',
      success: (res) => {
        clearTimeout(timer)
        if (!res.code) {
          reject(new Error('微信登录 code 获取失败'))
          return
        }
        resolve(res.code)
      },
      fail: (err) => {
        clearTimeout(timer)
        reject(new Error(`微信登录失败: ${err.errMsg || '未知错误'}`))
      }
    })
  })
}

function wechatLoginWithCode(code: string, userInfo: UserInfo): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/v1/auth/login`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      timeout: 15000,
      data: {
        code,
        nickname: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl
      },
      success: (res: any) => {
        const data = res.data as { code: number; message: string; data: any }
        if (res.statusCode !== 200 || !data || data.code !== 0) {
          reject(new Error(data?.message || `登录失败 (${res.statusCode})`))
          return
        }
        saveLoginSession(data.data)
        resolve()
      },
      fail: (err: any) => {
        reject(new Error(`登录请求失败: ${err.errMsg || '网络异常'}`))
      }
    })
  })
}

// 如果已经登录，直接跳转
if (isLoggedIn() && !isTokenExpired()) {
  uni.switchTab({ url: '/pages/explore/explore' })
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #fff8f0 0%, #fff0e0 50%, #ffe8cc 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 40rpx;
  position: relative;
  overflow: hidden;
}

.login-card {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx;
  padding: 60rpx 48rpx;
  box-shadow: 0 16rpx 48rpx rgba(255, 125, 0, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
}

.app-name {
  font-size: 44rpx;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 2rpx;
}

.app-slogan {
  font-size: 26rpx;
  color: #999;
  margin-top: 12rpx;
  letter-spacing: 1rpx;
}

.mascot {
  font-size: 120rpx;
  margin: 48rpx 0 40rpx;
  line-height: 1;
}

.wechat-btn {
  width: 100%;
  height: 96rpx;
  background: #07c160;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border: none;
  margin-top: 16rpx;
  &::after {
    border: none;
  }
}

.btn-icon {
  font-size: 32rpx;
}

.btn-text {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
}

.error-tip {
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #e74c3c;
  text-align: center;
  padding: 12rpx 24rpx;
  background: #fef0ee;
  border-radius: 12rpx;
  width: 100%;
  box-sizing: border-box;
}

.tips {
  margin-top: 32rpx;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4rpx;
}

.tip {
  font-size: 22rpx;
  color: #bbb;
}

.link {
  font-size: 22rpx;
  color: #2d8cf0;
}

// 装饰圆圈
.decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 125, 0, 0.06);
}

.c1 {
  width: 300rpx;
  height: 300rpx;
  top: -80rpx;
  right: -60rpx;
}

.c2 {
  width: 200rpx;
  height: 200rpx;
  bottom: 100rpx;
  left: -60rpx;
}

.c3 {
  width: 160rpx;
  height: 160rpx;
  bottom: -40rpx;
  right: 80rpx;
  background: rgba(255, 125, 0, 0.04);
}
</style>
