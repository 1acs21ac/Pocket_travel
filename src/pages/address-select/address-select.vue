<template>
  <view class="address-select-page">
    <view class="map-container">
      <map
        id="selectMap"
        class="map"
        :latitude="mapCenter.latitude"
        :longitude="mapCenter.longitude"
        :markers="markers"
        :scale="scale"
        :show-location="true"
        @tap="onMapTap"
        @regionchange="onRegionChange"
      />
      <view class="center-marker">
        <view class="center-dot" />
        <view class="center-pulse" />
      </view>
      <view v-if="selectedAddress" class="address-card">
        <text class="address-text">{{ selectedAddress }}</text>
      </view>
    </view>

    <view class="bottom-panel">
      <view class="action-row">
        <button class="ghost-btn" @tap="onCancel">取消</button>
        <button class="primary-btn" :disabled="!selectedAddress || saving" @tap="onConfirm">
          {{ saving ? '保存中...' : '确认位置' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref, reactive } from 'vue'
import { request } from '@/utils/request'

interface Marker {
  id: number
  latitude: number
  longitude: number
  iconPath: string
  width: number
  height: number
}

const spotId = ref('')
const spotName = ref('')
const mapCenter = reactive({ latitude: 31.2304, longitude: 121.4737 })
const scale = ref(16)
const markers = ref<Marker[]>([])
const selectedAddress = ref('')
const saving = ref(false)

onLoad((options) => {
  spotId.value = String(options?.spotId || '')
  spotName.value = String(options?.spotName || '')
  
  if (options?.lat && options?.lng) {
    mapCenter.latitude = Number(options.lat)
    mapCenter.longitude = Number(options.lng)
  }
})

function onMapTap(e: any) {
  const { latitude, longitude } = e.detail
  
  markers.value = [{
    id: 1,
    latitude,
    longitude,
    iconPath: '/static/pin.png',
    width: 30,
    height: 30
  }]
  
  getAddressFromCoords(latitude, longitude)
}

function onRegionChange() {}

async function getAddressFromCoords(lat: number, lng: number) {
  try {
    const res = await request<{ result: { address: string; formatted_addresses?: { recommend: string } } }>(
      `/api/v1/location/reverse-geocode?lat=${lat}&lng=${lng}`,
      { method: 'GET' }
    )
    selectedAddress.value = res?.result?.formatted_addresses?.recommend || res?.result?.address || ''
  } catch {
    selectedAddress.value = `坐标: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}

function onCancel() {
  uni.navigateBack()
}

async function onConfirm() {
  if (!selectedAddress.value || saving.value) return
  
  saving.value = true
  try {
    await request(`/api/v1/spots/${spotId.value}/address`, {
      method: 'PUT',
      data: { address: selectedAddress.value }
    })
    uni.showToast({ title: '地址已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.address-select-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.map-container {
  flex: 1;
  position: relative;
}

.map {
  width: 100%;
  height: 100%;
}

.center-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -100%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.center-dot {
  width: 24rpx;
  height: 24rpx;
  background: #ff7d00;
  border-radius: 50%;
  border: 4rpx solid #fff;
  box-shadow: 0 4rpx 16rpx rgba(255, 125, 0, 0.5);
}

.center-pulse {
  width: 48rpx;
  height: 12rpx;
  background: rgba(255, 125, 0, 0.25);
  border-radius: 50%;
  margin-top: -6rpx;
}

.address-card {
  position: absolute;
  bottom: 200rpx;
  left: 24rpx;
  right: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.address-text {
  font-size: 28rpx;
  color: #333;
  word-break: break-all;
  line-height: 1.5;
}

.bottom-panel {
  background: #fff;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.action-row {
  display: flex;
  gap: 24rpx;
}

.primary-btn,
.ghost-btn {
  flex: 1;
  margin: 0;
  border-radius: 999rpx;
  font-size: 30rpx;
  padding: 24rpx 0;
}

.primary-btn {
  background: #ff7d00;
  color: #fff;
}

.primary-btn[disabled] {
  background: #ccc;
  color: #fff;
}

.ghost-btn {
  background: #fff;
  color: #666;
  border: 2rpx solid #e5e7eb;
}
</style>
