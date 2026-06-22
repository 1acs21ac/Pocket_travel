<template>
  <view class="ptc-page path-page">
    <view class="path-hero">
      <view>
        <text class="ptc-title">路径</text>
        <text class="hint">把心情、时间和链接变成可执行路线。</text>
      </view>
      <view class="bean-pill">🫘 {{ beanBalance }} / 200</view>
    </view>

    <view class="path-actions">
      <view class="action-card orange" @tap="activePanel = 'generate'">
        <text class="action-title">🎲 心情生成</text>
        <text class="action-sub">消耗40豆子生成路线</text>
      </view>
      <view class="action-card green" @tap="openImportPanel">
        <text class="action-title">🔗 导入链接</text>
        <text class="action-sub">小红书/抖音/公众号</text>
      </view>
    </view>

    <view class="current-card">
      <view class="current-head">
        <text class="trip-badge">旅行中</text>
        <text class="hint">{{ currentRoute ? '2个地点 · 进度 50%' : '还没有进行中的行程' }}</text>
      </view>
      <text class="current-title">{{ currentRoute?.title || '周末情绪补给路线' }}</text>
      <text class="current-sub">{{ currentRoute?.subtitle || '先生成一条路线，系统会在这里展示执行进度。' }}</text>
      <view class="progress">
        <view class="progress-fill" :style="{ width: currentRoute ? '50%' : '12%' }" />
      </view>
      <view class="mini-actions">
        <text>问一问</text>
        <text>清单</text>
        <text>天气</text>
      </view>
    </view>

    <view v-if="activePanel === 'generate'" class="panel">
      <view class="panel-tabs">
        <text class="tab active">偏好设置</text>
        <text class="tab" @tap="openImportPanel">链接导入</text>
      </view>

      <view class="field-block">
        <text class="label">城市</text>
        <input v-model="form.city" class="input" placeholder="例如：上海">
      </view>

      <view class="field-block">
        <text class="label">行程天数</text>
        <view class="chip-row">
          <text
            v-for="option in dayModes"
            :key="option.value"
            class="chip"
            :class="{ selected: form.dayMode === option.value }"
            @tap="selectDayMode(option.value)"
          >
            {{ option.label }}
          </text>
        </view>
        <text class="date-range-hint">支持2至7天，多日行程会按周末路线优先生成。</text>
        <text v-if="dateRangeText" class="hint">{{ dateRangeText }}</text>
      </view>

      <view class="field-block">
        <text class="label">氛围倾向</text>
        <view class="chip-row">
          <text
            v-for="tag in atmosphereOptions"
            :key="tag"
            class="chip"
            :class="{ selected: form.spotPreferences.includes(tag) }"
            @tap="togglePreference(tag)"
          >
            {{ tag }}
          </text>
        </view>
      </view>

      <view class="footer-cost">
        <text>当前余额 {{ beanBalance }} 豆，本次消耗 40 豆</text>
        <button class="primary-btn" :disabled="generating" @tap="generateRoute">
          {{ generating ? '生成中...' : '生成我的路线' }}
        </button>
      </view>
    </view>

    <view v-if="activePanel === 'import'" class="panel import-panel">
      <view class="panel-tabs">
        <text class="tab" @tap="activePanel = 'generate'">偏好设置</text>
        <text class="tab active">链接导入</text>
      </view>
      <textarea
        v-model="importUrl"
        class="textarea"
        placeholder="粘贴小红书/抖音/公众号链接，解析成功后消耗40豆子生成路线"
        maxlength="500"
      />
      <view class="footer-cost">
        <text>失败不扣豆。当前余额 {{ beanBalance }} 豆</text>
        <button class="primary-btn" :disabled="importing" @tap="importRoute">
          {{ importing ? '导入中...' : '导入并生成路线' }}
        </button>
      </view>
    </view>

    <view class="block">
      <text class="block-title">历史行程</text>
      <view v-if="routeLoading" class="hint">加载路线中…</view>
      <view v-else-if="routeError" class="hint err">{{ routeError }}</view>
      <view v-else-if="!routes.length" class="empty">生成或采纳路线后，会按月份出现在这里。</view>
      <view v-else>
        <view v-for="group in groupedRoutes" :key="group.month" class="month-group">
          <view class="month-title">{{ group.month }}</view>
          <view v-for="r in group.items" :key="String(r.id)" class="row" @tap="goRouteDetail(r.id)">
            <view class="row-main">
              <text class="row-title">{{ r.title || '未命名路线' }}</text>
              <text class="row-sub">{{ r.subtitle || '点击查看地图与途经点' }}</text>
            </view>
            <text class="row-action" @tap.stop="onDeleteRoute(r.id)">删除</text>
          </view>
        </view>
      </view>
    </view>

    <view class="block">
      <text class="block-title">推荐景点</text>
      <view v-if="spotLoading" class="hint">加载景点中…</view>
      <view v-else-if="spotError" class="hint err">{{ spotError }}</view>
      <view v-else-if="!spots.length" class="empty">暂无景点数据</view>
      <view v-else>
        <view v-for="s in spots" :key="String(s.id)" class="row" @tap="goSpotDetail(s.id)">
          <view class="row-main">
            <text class="row-title">{{ s.name || '未命名景点' }}</text>
            <text class="row-sub">可进入详情页打卡、评论和分享</text>
          </view>
          <text class="row-action" @tap.stop="onFavoriteSpot(s.id)">收藏</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBeanStore } from '@/store/bean'
import { useUserStore } from '@/store/user'
import { request } from '@/utils/request'
import { isLoggedIn, isTokenExpired } from '@/utils/auth'
import { buildRouteGeneratePayload, resolveDateRangeText, togglePreferenceValue } from './route-factory'

interface RouteRow {
  id: number | string
  title?: string
  subtitle?: string
  source_type?: string
  created_at?: string
}

interface SpotRow {
  id: number | string
  name?: string
}

const beanStore = useBeanStore()
const userStore = useUserStore()
const routes = ref<RouteRow[]>([])
const spots = ref<SpotRow[]>([])
const routeLoading = ref(false)
const spotLoading = ref(false)
const routeError = ref('')
const spotError = ref('')
const generating = ref(false)
const importing = ref(false)
const importUrl = ref('')
const activePanel = ref<'generate' | 'import'>('generate')
const dateRangeText = ref('')

const form = ref({
  city: '上海',
  dayMode: 'one_day',
  spotPreferences: ['节奏舒缓', '拍照出片'],
  moodTags: userStore.moodTags
})

const dayModes = [
  { label: '半天', value: 'half_day' },
  { label: '1天', value: 'one_day' },
  { label: '2天', value: 'two_day' },
  { label: '更多', value: 'multi_day' }
]

const beanBalance = computed(() => beanStore.balance)
const currentRoute = computed(() => routes.value[0])
const groupedRoutes = computed(() => {
  const groups = new Map<string, RouteRow[]>()
  for (const route of routes.value) {
    const date = route.created_at ? new Date(route.created_at) : new Date()
    const month = `${date.getFullYear()}年${date.getMonth() + 1}月`
    groups.set(month, [...(groups.get(month) || []), route])
  }
  return Array.from(groups.entries()).map(([month, items]) => ({ month, items }))
})
const atmosphereOptions = computed(() => {
  const moods = userStore.moodTags.join(',')
  if (moods.includes('社交') || moods.includes('庆祝')) return ['打卡出片优先', '体验互动优先']
  if (moods.includes('独处') || moods.includes('安静')) return ['极致安静', '白噪音陪伴']
  return ['节奏舒缓', '充实丰富', '咖啡', '自然', '展览', '轻社交']
})

onShow(async () => {
  if (uni.getStorageSync('pathOpenImport') === '1') {
    uni.removeStorageSync('pathOpenImport')
    activePanel.value = 'import'
  }
  await loadAll()
})

async function ensureSession() {
  if (!isLoggedIn() || isTokenExpired()) {
    uni.navigateTo({ url: '/pages/login/login' })
    return false
  }
  return true
}

async function loadAll() {
  routeError.value = ''
  spotError.value = ''
  try {
    await ensureSession()
  } catch (e) {
    const msg = e instanceof Error ? e.message : '登录失败'
    routeError.value = msg
    spotError.value = msg
    routes.value = []
    spots.value = []
    uni.showToast({ title: msg, icon: 'none' })
    return
  }

  routeLoading.value = true
  spotLoading.value = true
  await Promise.all([fetchBeanBalance(), fetchRoutes(), fetchSpots()])
}

async function fetchBeanBalance() {
  const data = await request<{ balance: number }>('/api/v1/beans/balance', { method: 'GET' })
  beanStore.setBalance(data.balance)
}

async function fetchRoutes() {
  try {
    const data = await request<{ list: RouteRow[] }>('/api/v1/routes', { method: 'GET' })
    routes.value = data.list ?? []
  } catch (e) {
    routes.value = []
    routeError.value = e instanceof Error ? e.message : '路线列表加载失败'
  } finally {
    routeLoading.value = false
  }
}

async function fetchSpots() {
  try {
    const data = await request<{ list: SpotRow[] }>('/api/v1/spots', { method: 'GET' })
    spots.value = data.list ?? []
  } catch (e) {
    spots.value = []
    spotError.value = e instanceof Error ? e.message : '景点列表加载失败'
  } finally {
    spotLoading.value = false
  }
}

function openImportPanel() {
  activePanel.value = 'import'
}

function selectDayMode(value: string) {
  form.value.dayMode = value
  dateRangeText.value = resolveDateRangeText(value)
}

function togglePreference(tag: string) {
  form.value.spotPreferences = togglePreferenceValue(form.value.spotPreferences, tag)
}

async function generateRoute() {
  if (beanBalance.value < 40) {
    uni.showModal({
      title: '豆子不足',
      content: '生成路线需要40豆子。可以通过打卡、评论或更新心情获取豆子。'
    })
    return
  }
  generating.value = true
  try {
    await ensureSession()
    const result = await request<{ routeId: number; remainingBeans: number }>('/api/v1/routes/generate', {
      method: 'POST',
      data: buildRouteGeneratePayload(form.value, userStore.moodTags)
    })
    beanStore.setBalance(result.remainingBeans)
    uni.showToast({ title: '路线已生成', icon: 'success' })
    await fetchRoutes()
    goRouteDetail(result.routeId)
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '生成失败', icon: 'none' })
  } finally {
    generating.value = false
  }
}

async function importRoute() {
  if (!/^https?:\/\//.test(importUrl.value.trim())) {
    uni.showToast({ title: '请输入 http 或 https 链接', icon: 'none' })
    return
  }
  if (beanBalance.value < 40) {
    uni.showModal({
      title: '豆子不足',
      content: '导入链接需要40豆子。可以通过打卡、评论或更新心情获取豆子。'
    })
    return
  }
  importing.value = true
  try {
    await ensureSession()
    const result = await request<{ routeId: number; remainingBeans: number }>('/api/v1/routes/import-link', {
      method: 'POST',
      data: { url: importUrl.value.trim() }
    })
    beanStore.setBalance(result.remainingBeans)
    importUrl.value = ''
    uni.showToast({ title: '导入成功', icon: 'success' })
    await fetchRoutes()
    goRouteDetail(result.routeId)
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '导入失败', icon: 'none' })
  } finally {
    importing.value = false
  }
}

function goRouteDetail(routeId: number | string) {
  uni.navigateTo({ url: `/pages/route-detail/route-detail?routeId=${routeId}` })
}

function goSpotDetail(spotId: number | string) {
  uni.navigateTo({ url: `/pages/spot-detail/spot-detail?spotId=${spotId}` })
}

function onDeleteRoute(routeId: number | string) {
  uni.showModal({
    title: '删除路线',
    content: '确定删除这条路线吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await ensureSession()
        await request(`/api/v1/routes/${routeId}`, { method: 'DELETE' })
        uni.showToast({ title: '已删除', icon: 'success' })
        await fetchRoutes()
      } catch (e) {
        uni.showToast({ title: e instanceof Error ? e.message : '删除失败', icon: 'none' })
      }
    }
  })
}

async function onFavoriteSpot(spotId: number | string) {
  try {
    await ensureSession()
    await request(`/api/v1/spots/${spotId}/favorite`, { method: 'POST', data: {} })
    uni.showToast({ title: '已收藏', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '收藏失败', icon: 'none' })
  }
}
</script>

<style scoped lang="scss">
.path-page {
  gap: 24rpx;
  padding: 32rpx 24rpx 80rpx;
  background: linear-gradient(180deg, #fff7ed 0%, #f7f8fa 38%, #f7f8fa 100%);
}
.path-hero,
.current-card,
.panel,
.block {
  border-radius: 28rpx;
  background: #fff;
  padding: 28rpx;
  box-shadow: 0 12rpx 30rpx rgba(90, 62, 33, 0.08);
}
.path-hero,
.path-actions,
.current-head,
.mini-actions,
.panel-tabs,
.footer-cost,
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}
.date-range-hint {
  display: block;
  margin-top: 12rpx;
  color: #7c756e;
  font-size: 24rpx;
}
.hint,
.empty {
  color: #7c756e;
  font-size: 24rpx;
  display: block;
}
.hint.err {
  color: #c0392b;
}
.bean-pill,
.trip-badge {
  border-radius: 999rpx;
  padding: 10rpx 18rpx;
  background: #fff3d6;
  color: #a45c00;
  font-size: 24rpx;
}
.path-actions {
  align-items: stretch;
}
.action-card {
  flex: 1;
  border-radius: 28rpx;
  padding: 26rpx;
  color: #2b2118;
}
.action-card.orange {
  background: linear-gradient(135deg, #ffd9a8 0%, #fff4df 100%);
}
.action-card.green {
  background: linear-gradient(135deg, #c9f3d1 0%, #f1fff4 100%);
}
.action-title,
.current-title,
.block-title {
  font-size: 32rpx;
  font-weight: 700;
  display: block;
}
.action-sub,
.current-sub,
.row-sub,
.month-title {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #7c756e;
  display: block;
}
.progress {
  height: 12rpx;
  margin: 24rpx 0;
  border-radius: 999rpx;
  background: #f0e2d3;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #ff7d00;
}
.mini-actions text {
  flex: 1;
  padding: 14rpx 0;
  border-radius: 18rpx;
  background: #f7f8fa;
  color: #5b5148;
  text-align: center;
  font-size: 24rpx;
}
.tab {
  flex: 1;
  padding: 16rpx 0;
  border-radius: 20rpx;
  background: #f5f5f5;
  text-align: center;
  font-size: 26rpx;
}
.tab.active {
  background: #2b2118;
  color: #fff;
}
.field-block {
  margin-top: 26rpx;
}
.label {
  display: block;
  margin-bottom: 14rpx;
  font-size: 26rpx;
  font-weight: 600;
}
.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  border-radius: 20rpx;
  background: #f7f8fa;
  padding: 18rpx 22rpx;
  font-size: 28rpx;
}
.textarea {
  min-height: 180rpx;
  margin-top: 26rpx;
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.chip {
  border-radius: 999rpx;
  padding: 12rpx 20rpx;
  background: #f7f8fa;
  color: #5b5148;
  font-size: 24rpx;
}
.chip.selected {
  background: #ff7d00;
  color: #fff;
}
.footer-cost {
  margin-top: 28rpx;
  align-items: center;
}
.footer-cost text {
  flex: 1;
  color: #7c756e;
  font-size: 24rpx;
}
.primary-btn {
  margin: 0;
  border-radius: 999rpx;
  background: #ff7d00;
  color: #fff;
  font-size: 26rpx;
}
.row {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.row-main {
  flex: 1;
  min-width: 0;
}
.row-title {
  font-size: 28rpx;
  font-weight: 600;
  display: block;
}
.row-action {
  color: #2d8cf0;
  font-size: 26rpx;
}
</style>
