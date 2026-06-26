import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface RecommendCard {
  id: string | number
  title: string
  subtitle: string
  cover: string
  goneCount: number
  sceneType: string
  recommendationRule: string
}

export interface RouteRecommendationSource {
  id: string | number
  title?: string
  subtitle?: string
  cover?: string
  goneCount?: number
  sceneType?: string
}

const sceneCopy = {
  healing: {
    title: '把自己还给自己',
    subtitle: '安静散步 · 温柔补能 · 慢节奏周末',
    rule: '安静/低落情绪优先推荐自然、散步、低刺激空间',
    cover: 'https://picsum.photos/seed/healing/720/420'
  },
  social: {
    title: '甜妹出街快门按烂',
    subtitle: '咖啡车 · 滨江风 · 轻社交拍照局',
    rule: '社交/庆祝情绪优先推荐咖啡、展览、出片场景',
    cover: 'https://picsum.photos/seed/social/720/420'
  },
  rainy: {
    title: '雨天也能松弛一下',
    subtitle: '室内展览 · 书店 · 热饮回血',
    rule: '雨天优先推荐室内、短距离、可停留空间',
    cover: 'https://picsum.photos/seed/rainy/720/420'
  },
  default: {
    title: '今天也有小小出逃',
    subtitle: '咖啡 · 自然 · 展览 · 轻量探索',
    rule: '无明确画像时使用通用周末微旅行推荐',
    cover: 'https://picsum.photos/seed/explore/720/420'
  }
}

function resolveSceneType(moodTags: string[], socialIdentity = '', weatherText = '') {
  const moodText = moodTags.join(' ')
  if (/雨|阴/.test(weatherText)) return 'rainy'
  if (/社交|庆祝|拍照|甜妹|朋友/.test(`${moodText} ${socialIdentity}`)) return 'social'
  if (/安静|低落|疲惫|放松|治愈/.test(moodText)) return 'healing'
  return 'default'
}

export function buildPersonalizedRecommendCards(
  routes: RouteRecommendationSource[],
  moodTags: string[],
  socialIdentity = '',
  weatherText = ''
): RecommendCard[] {
  const fallbackScene = resolveSceneType(moodTags, socialIdentity, weatherText)
  
  // 当后端没有返回数据时，使用多个示例场景
  if (!routes.length) {
    const sceneTypes: SceneType[] = ['healing', 'social', 'creative', 'adventure', 'foodie', 'romantic']
    return sceneTypes.map((scene, index) => {
      const copy = sceneCopy[scene] || sceneCopy.default
      return {
        id: `demo-${scene}-${index}`,
        title: copy.title,
        subtitle: copy.subtitle,
        cover: copy.cover,
        goneCount: Math.floor(Math.random() * 300) + 100,
        sceneType: scene,
        recommendationRule: copy.rule
      }
    })
  }

  // 为每个路线创建多个情绪风格的卡片
  const sceneTypes: SceneType[] = ['healing', 'social', 'rainy', 'default']
  const cards: RecommendCard[] = []
  
  for (const route of routes) {
    for (const scene of sceneTypes) {
      const copy = sceneCopy[scene] || sceneCopy.default
      cards.push({
        id: `${route.id}-${scene}`,
        title: route.title || copy.title,
        subtitle: copy.subtitle,
        cover: route.cover || copy.cover,
        goneCount: route.goneCount ?? Math.floor(Math.random() * 300) + 100,
        sceneType: scene,
        recommendationRule: copy.rule
      })
    }
  }
  
  return cards
}

/**
 * 路线状态：当前行程 + 推荐卡片（探索页瀑布流）。
 */
export const useRouteStore = defineStore('route', () => {
  const currentRouteId = ref('')
  const historyRouteIds = ref<string[]>([])
  const recommendCards = ref<RecommendCard[]>(
    buildPersonalizedRecommendCards(
      [
        { id: 'route-1', sceneType: 'healing', goneCount: 328 },
        { id: 'route-2', sceneType: 'social', goneCount: 217 }
      ],
      ['放松中'],
      '独处青年',
      '晴'
    )
  )
  const selectedPreviewCard = ref<RecommendCard | null>(null)

  function setRecommendCards(cards: RecommendCard[]) {
    recommendCards.value = cards
  }

  return {
    currentRouteId,
    historyRouteIds,
    recommendCards,
    setRecommendCards,
    selectedPreviewCard
  }
})
