<template>
  <view class="explore-page">
    <!-- 顶部状态栏：显示当前心情和豆子余额 -->
    <view class="explore-status">
      <view class="status-row">
        <text class="status-city">{{ locationWeatherText }}</text>
        <text class="status-bean">🫘 {{ beanBalance }}</text>
      </view>
      <view class="status-row">
        <text class="status-mood">😌 {{ primaryMood }}</text>
        <text v-if="moodUpdateHint" class="status-bean" @tap="goToMoodQa">{{ moodUpdateHint }}</text>
        <text v-else class="status-bean" @tap="goToMoodQa">更新心情</text>
      </view>
    </view>

    <!-- 快捷导入入口：探索页只负责切到路径页，导入表单由路径页承载。 -->
    <view class="import-entry" @tap="onImportTap">
      <text class="import-placeholder">粘贴小红书/抖音链接，一键抄作业...</text>
      <text class="import-btn">导入</text>
    </view>

    <!-- 瀑布流推荐卡片 -->
    <view class="waterfall">
      <view
        v-for="card in recommendCards"
        :key="card.id"
        class="recommend-card"
        @tap="goToRoutePreview(card)"
      >
        <image class="recommend-cover" :src="card.cover" mode="aspectFill" />
        <view class="recommend-body">
          <text class="recommend-title">{{ card.title }}</text>
          <text class="recommend-subtitle">{{ card.subtitle }}</text>
          <text class="recommend-rule">{{ card.recommendationRule }}</text>
          <text class="recommend-gone">👥 {{ card.goneCount }} 人去过</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBeanStore } from '@/store/bean'
import { buildPersonalizedRecommendCards, useRouteStore, type RecommendCard } from '@/store/route'
import { useUserStore } from '@/store/user'
import { request } from '@/utils/request'
import { getLocationAndWeather } from '@/utils/weather'

const userStore = useUserStore()
const beanStore = useBeanStore()
const routeStore = useRouteStore()
const moodUpdateHint = ref('')
const locationWeatherText = ref('📍 定位中...')

// 从 Pinia 获取情绪标签与豆子余额，满足 PRD 顶部状态栏展示需求。
const primaryMood = computed(() => userStore.primaryMoodText)
const beanBalance = computed(() => beanStore.balance)
const recommendCards = computed(() => routeStore.recommendCards)

onMounted(async () => {
  try {
    await Promise.all([
      fetchUserProfile(),
      fetchBeanBalance(),
      fetchLocationAndWeather()
    ])
    await fetchMoodProfile()
    await fetchRoutes()
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : '加载失败',
      icon: 'none'
    })
  }
})

/**
 * 获取位置和天气信息
 */
async function fetchLocationAndWeather() {
  try {
    const result = await getLocationAndWeather()
    locationWeatherText.value = `📍 ${result.displayText}`
  } catch (error) {
    console.warn('获取位置天气失败:', error)
    locationWeatherText.value = '📍 上海 · ☀️ 22℃'
  }
}

function goToMoodQa() {
  uni.navigateTo({
    url: '/pages/mood-qa/mood-qa'
  })
}

function onImportTap() {
  uni.setStorageSync('pathOpenImport', '1')
  uni.switchTab({
    url: '/pages/path/path'
  })
}

function goToRoutePreview(card: RecommendCard) {
  routeStore.selectedPreviewCard = card
  uni.navigateTo({ url: `/pages/route-preview/route-preview?recommendId=${encodeURIComponent(String(card.id))}` })
}

async function fetchUserProfile() {
  const data = await request<{
    nickname?: string
    avatarUrl?: string
  }>('/api/v1/user/profile', {
    method: 'GET'
  })
  userStore.setProfile({
    nickname: data.nickname ?? userStore.nickname,
    avatar: data.avatarUrl ?? userStore.avatar
  })
}

async function fetchBeanBalance() {
  const data = await request<{ balance: number }>('/api/v1/beans/balance', {
    method: 'GET'
  })
  beanStore.setBalance(data.balance)
}

async function fetchMoodProfile() {
  const data = await request<{ moodTags: string[]; socialIdentity?: string; lastUpdatedAt?: string | null }>('/api/v1/mood-map/profile', {
    method: 'GET'
  })
  userStore.setMoodTags(data.moodTags?.length ? data.moodTags : ['未设置'])
  moodUpdateHint.value = shouldPromptMoodUpdate(data.lastUpdatedAt) ? '心情已超过7天，去更新' : ''
}

function shouldPromptMoodUpdate(lastUpdatedAt?: string | null) {
  if (!lastUpdatedAt) return true
  const updatedAt = new Date(lastUpdatedAt).getTime()
  if (Number.isNaN(updatedAt)) return true
  return Date.now() - updatedAt > 7 * 24 * 60 * 60 * 1000
}

async function fetchRoutes() {
  const data = await request<{
    list: Array<{ id: number; title?: string; subtitle?: string; cover?: string; goneCount?: number; sceneType?: string }>
  }>('/api/v1/routes', {
    method: 'GET'
  })
  routeStore.setRecommendCards(buildPersonalizedRecommendCards(data.list || [], userStore.moodTags, '', locationWeatherText.value))
}
</script>

<style src="./explore.scss" lang="scss" scoped></style>
