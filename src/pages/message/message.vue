<template>
  <view class="ptc-page message-page">
    <view class="header">
      <text class="ptc-title">互动消息</text>
      <text v-if="unreadCount > 0" class="mark-read" @tap="markAllRead">全部已读</text>
    </view>
    <text class="hint">展示打卡、评论和分享相关提醒。</text>

    <view v-if="loading" class="hint">加载中...</view>
    <view v-else-if="!messages.length" class="empty">暂无消息</view>
    <view v-else>
      <view v-for="item in messages" :key="item.id" class="message-card" :class="{ unread: item.unread }" @tap="markAsRead(item)">
        <view class="message-head">
          <text class="message-title">{{ item.title }}</text>
          <text v-if="item.unread" class="badge">未读</text>
        </view>
        <text class="message-body">{{ item.body }}</text>
        <text class="message-time">{{ item.time }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request } from '@/utils/request'

interface Message {
  id: number
  title: string
  body: string
  time: string
  unread: boolean
}

const messages = ref<Message[]>([])
const loading = ref(false)

const unreadCount = computed(() => messages.value.filter(m => m.unread).length)

onShow(loadMessages)

async function loadMessages() {
  loading.value = true
  try {
    const data = await request<{ list: Array<{ id: number; title: string; body: string; createdAt: string; isRead: boolean }> }>(
      '/api/v1/notifications',
      { method: 'GET' }
    )
    messages.value = (data.list || []).map(item => ({
      id: item.id,
      title: item.title,
      body: item.body,
      time: formatTime(item.createdAt),
      unread: !item.isRead
    }))
  } catch {
    messages.value = [
      { id: 1, title: '豆子到账', body: '你今天完成了情绪更新，已获得5豆子。', time: '今天 09:20', unread: false },
      { id: 2, title: '评论有新点赞', body: '你在「林间步道」的评论被同频用户点赞。', time: '昨天 20:14', unread: false },
      { id: 3, title: '路线分享可查看', body: '分享图已生成，好友扫码后可进入对应路线或景点。', time: '周三 16:08', unread: false }
    ]
  } finally {
    loading.value = false
  }
}

function markAsRead(item: Message) {
  if (!item.unread) return
  item.unread = false
  request(`/api/v1/notifications/${item.id}/read`, { method: 'POST' }).catch(() => {})
}

function markAllRead() {
  messages.value.forEach(m => { m.unread = false })
  request('/api/v1/notifications/read-all', { method: 'POST' }).catch(() => {})
}

function formatTime(isoString: string) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  } else if (diffDays === 1) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  } else if (diffDays < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${weekdays[date.getDay()]} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  } else {
    return `${date.getMonth() + 1}/${date.getDate()}`
  }
}
</script>

<style scoped lang="scss">
.message-page {
  gap: 22rpx;
  padding: 34rpx 24rpx;
  background: #f6f8fb;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ptc-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1f2937;
}
.mark-read {
  font-size: 26rpx;
  color: #3b82f6;
  padding: 8rpx 16rpx;
}
.hint,
.message-body,
.message-time {
  color: #6b7280;
  font-size: 24rpx;
  display: block;
}
.empty {
  text-align: center;
  padding: 60rpx 0;
  color: #9ca3af;
  font-size: 28rpx;
}
.message-card {
  border-radius: 28rpx;
  background: #fff;
  padding: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(30, 41, 59, 0.06);
}
.message-card.unread {
  border: 2rpx solid #ffb861;
}
.message-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.message-title {
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 700;
}
.badge {
  border-radius: 999rpx;
  padding: 6rpx 14rpx;
  background: #ff5252;
  color: #fff;
  font-size: 22rpx;
}
.message-body {
  margin-top: 12rpx;
  color: #374151;
}
.message-time {
  margin-top: 14rpx;
}
</style>
