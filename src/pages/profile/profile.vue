<template>
  <view class="ptc-page profile-page">
    <view v-if="loading" class="hint">加载中…</view>
    <view v-else-if="errorText" class="hint err">{{ errorText }}</view>
    <view v-else class="profile-body">
      <!-- 顶部用户卡片：头像 + 昵称 + 豆子 -->
      <view class="user-hero">
        <view class="hero-content">
          <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
            <image
              class="avatar"
              :src="userStore.avatar || defaultAvatar"
              mode="aspectFill"
            />
            <view class="avatar-camera">
              <text class="camera-icon">📷</text>
            </view>
          </button>
          <view class="nickname-row">
            <input
              class="nickname-input"
              type="nickname"
              placeholder="点击设置昵称"
              placeholder-class="nickname-placeholder"
              :value="userStore.nickname"
              @blur="onNicknameBlur"
            />
            <text class="nickname-edit-icon">✎</text>
          </view>
          <view class="bean-pill">
            <text class="bean-icon">🫘</text>
            <text class="bean-count">{{ beanStore.balance }}</text>
            <text class="bean-label">豆子</text>
          </view>
        </view>
      </view>

      <!-- 心情 -->
      <view class="card mood-card">
        <view class="mood-head">
          <text class="mood-title">当前心情</text>
          <text class="mood-emoji">😌</text>
        </view>
        <view class="tag-cloud">
          <text v-for="tag in userStore.moodTags" :key="tag" class="mood-tag">{{ tag }}</text>
        </view>
      </view>

      <!-- 核心功能 -->
      <view class="card action-card">
        <text class="action-title">核心功能</text>
        <view class="grid">
          <view class="grid-item" @tap="goMoodQa">
            <text class="grid-icon">💭</text>
            <text class="grid-text">情绪管理</text>
          </view>
          <view class="grid-item" @tap="goTagSetting">
            <text class="grid-icon">🏷️</text>
            <text class="grid-text">兴趣标签</text>
          </view>
          <view class="grid-item" @tap="goMessage">
            <text class="grid-icon">💬</text>
            <text class="grid-text">互动消息</text>
            <view class="red-dot"></view>
          </view>
          <view class="grid-item" @tap="goBeanLog">
            <text class="grid-icon">📊</text>
            <text class="grid-text">豆子明细</text>
          </view>
        </view>
      </view>

      <!-- 足迹 -->
      <view class="card footprint-card">
        <text class="action-title">我的足迹</text>
        <view class="footprint-grid">
          <view class="footprint route">🌿 周末疗愈路线</view>
          <view class="footprint photo">📸 林间步道打卡</view>
          <view class="footprint photo">☕ 猫咖书店</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { useBeanStore } from '@/store/bean'
import { useUserStore } from '@/store/user'
import { request } from '@/utils/request'

const userStore = useUserStore()
const beanStore = useBeanStore()
const loading = ref(true)
const errorText = ref('')
const defaultAvatar = 'https://picsum.photos/200/200?profile=avatar'

onShow(async () => {
  await loadProfilePage()
})

async function loadProfilePage() {
  loading.value = true
  errorText.value = ''
  try {
    await Promise.all([fetchUserProfile(), fetchBeanBalance(), fetchMoodProfile()])
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载失败'
    uni.showToast({ title: errorText.value, icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function fetchUserProfile() {
  const data = await request<{ openid?: string; nickname?: string; avatarUrl?: string }>(
    '/api/v1/user/profile',
    { method: 'GET' }
  )
  userStore.setProfile({
    openid: data.openid ?? userStore.openid,
    nickname: data.nickname ?? userStore.nickname,
    avatar: data.avatarUrl ?? userStore.avatar
  })
}

async function fetchBeanBalance() {
  const data = await request<{ balance: number }>('/api/v1/beans/balance', { method: 'GET' })
  beanStore.setBalance(data.balance)
}

async function fetchMoodProfile() {
  const data = await request<{ moodTags?: string[] }>('/api/v1/mood-map/profile', { method: 'GET' })
  userStore.setMoodTags(data.moodTags?.length ? data.moodTags : ['未设置'])
}

function goBeanLog() {
  uni.navigateTo({ url: '/pages/bean-log/bean-log' })
}

function goTagSetting() {
  uni.navigateTo({ url: '/pages/tag-setting/tag-setting' })
}

function goMoodQa() {
  uni.navigateTo({ url: '/pages/mood-qa/mood-qa' })
}

function goMessage() {
  uni.navigateTo({ url: '/pages/message/message' })
}

// 选择头像
function onChooseAvatar(e: any) {
  const avatarUrl = e.detail.avatarUrl
  console.log('选择头像:', avatarUrl)
  if (avatarUrl) {
    userStore.setProfile({
      openid: userStore.openid,
      nickname: userStore.nickname,
      avatar: avatarUrl
    })
    updateUserProfile({ avatarUrl })
  }
}

// 昵称输入完成
function onNicknameBlur(e: any) {
  const nickname = e.detail.value.trim()
  console.log('输入昵称:', nickname)
  if (nickname && nickname !== userStore.nickname) {
    userStore.setProfile({
      openid: userStore.openid,
      nickname: nickname,
      avatar: userStore.avatar
    })
    updateUserProfile({ nickname })
  }
}

// 更新用户资料到后端
async function updateUserProfile(params: { nickname?: string; avatarUrl?: string }) {
  try {
    await request('/api/v1/user/profile', {
      method: 'PUT',
      data: params
    })
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (error) {
    console.error('保存失败:', error)
  }
}
</script>

<style scoped lang="scss">
.profile-page {
  padding: 0 0 24rpx;
  background: #f5f7fa;
  min-height: 100vh;
}
.hint.err {
  color: #c0392b;
}
.profile-body {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

// ===== 顶部用户卡片 =====
.user-hero {
  position: relative;
  margin-bottom: 20rpx;
}
.hero-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 24rpx 40rpx;
}
.avatar-btn {
  position: relative;
  width: 168rpx;
  height: 168rpx;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  line-height: 0;
}
.avatar-btn::after {
  border: none;
}
.avatar {
  width: 168rpx;
  height: 168rpx;
  border-radius: 50%;
  background: #f5f5f5;
  border: 4rpx solid #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}
.avatar-camera {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 52rpx;
  height: 52rpx;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}
.camera-icon {
  font-size: 28rpx;
}
.nickname-row {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  max-width: 80%;
}
.nickname-input {
  font-size: 40rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
  background: transparent;
  border: none;
  padding: 0;
  width: auto;
}
.nickname-placeholder {
  color: #999;
  font-weight: 500;
}
.nickname-edit-icon {
  font-size: 28rpx;
  color: #999;
}
.bean-pill {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #fff;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.bean-icon {
  font-size: 32rpx;
}
.bean-count {
  font-size: 36rpx;
  font-weight: 700;
  color: #ff7d00;
}
.bean-label {
  font-size: 24rpx;
  color: #666;
  margin-left: 4rpx;
}

// ===== 通用卡片 =====
.card {
  margin: 0 24rpx;
  border-radius: 24rpx;
  background: #fff;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

// ===== 心情卡片 =====
.mood-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.mood-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.mood-emoji {
  font-size: 36rpx;
}
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.mood-tag {
  border-radius: 999rpx;
  padding: 10rpx 24rpx;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  color: #2e7d32;
  font-size: 24rpx;
  font-weight: 500;
}

// ===== 核心功能 =====
.action-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 24rpx;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  background: #f7f8fa;
  padding: 32rpx 16rpx;
  position: relative;
  transition: background 0.2s;
}
.grid-item:active {
  background: #eef0f3;
}
.grid-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}
.grid-text {
  font-size: 26rpx;
  color: #333;
}
.red-dot {
  position: absolute;
  top: 20rpx;
  right: 24rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #ff5252;
}

// ===== 足迹 =====
.footprint-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.footprint {
  border-radius: 18rpx;
  padding: 28rpx 20rpx;
  font-size: 26rpx;
  color: #333;
  text-align: left;
  font-weight: 500;
}
.footprint.route {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  color: #e65100;
}
.footprint.photo {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1565c0;
}
</style>
