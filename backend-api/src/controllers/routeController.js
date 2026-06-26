import { ok } from '../utils/response.js'
import { requireFields } from '../utils/validate.js'
import { getDb } from '../models/db.js'
import { addBeanLog, getBeanBalanceTx, updateBeanBalanceTx } from '../models/beanModel.js'
import { beanRule, ensureEnoughBeans } from '../utils/beanRule.js'
import {
  createRoute,
  createRouteLegsTx,
  createRouteRunTx,
  createRouteStopsTx,
  deleteRouteById,
  getRouteDetail,
  getRouteList,
  updateRouteRunTx
} from '../models/routeModel.js'
import { BizError } from '../utils/errors.js'
import { buildDeterministicRoutePlan, parseImportLink } from '../utils/routePlanningService.js'

function toJson(value, fallback) {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
  return value
}

async function recordFailedRouteRun({ userId, payload, sourceType, error }) {
  const failedConnection = await getDb().getConnection()
  try {
    await failedConnection.beginTransaction()
    await createRouteRunTx(failedConnection, {
      userId,
      sourceType,
      status: 'failed',
      inputJson: payload,
      error: error.message,
      consumedBeans: 0
    })
    await failedConnection.commit()
  } catch {
    await failedConnection.rollback()
  } finally {
    failedConnection.release()
  }
}

async function createChargedRoute({ userId, payload, sourceType, cost, reason }) {
  const connection = await getDb().getConnection()
  let runId = null

  try {
    await connection.beginTransaction()
    runId = await createRouteRunTx(connection, {
      userId,
      sourceType,
      status: 'running',
      inputJson: payload,
      consumedBeans: 0
    })

    const balance = await getBeanBalanceTx(connection, userId, { lock: true })
    ensureEnoughBeans(balance, cost)

    const plan = buildDeterministicRoutePlan(payload, { sourceType, sourceUrl: payload.sourceUrl || '' })
    const routeId = await createRoute(connection, {
      userId,
      title: plan.title,
      subtitle: plan.subtitle,
      sourceType,
      detail: plan.detail
    })
    await createRouteStopsTx(connection, routeId, plan.detail.spots)
    await createRouteLegsTx(connection, routeId, plan.detail.connections)

    const remainingBeans = balance - cost
    await updateBeanBalanceTx(connection, userId, remainingBeans)
    await addBeanLog(connection, { userId, delta: -cost, reason })
    if (runId !== null) {
      await updateRouteRunTx(connection, runId, {
        status: 'succeeded',
        outputJson: plan.detail,
        routeId,
        consumedBeans: cost
      })
    }
    await connection.commit()

    return {
      routeId,
      consumedBeans: cost,
      remainingBeans,
      moodWeightApplied: plan.detail.moodWeightApplied,
      sourceType,
      route: plan.detail
    }
  } catch (error) {
    await connection.rollback()
    if (error instanceof BizError) {
      await recordFailedRouteRun({ userId, payload, sourceType, error })
      throw error
    }

    await recordFailedRouteRun({ userId, payload, sourceType, error })

    const code = sourceType === 'import' ? 40002 : 40001
    const message = sourceType === 'import' ? '解析失败，请检查链接或手动生成路线' : '路线生成失败，请重试'
    throw new BizError(code, message, { consumedBeans: 0 })
  } finally {
    connection.release()
  }
}

export async function generateRoute(ctx) {
  const userId = ctx.state.user.userId
  requireFields(ctx.request.body, ['city', 'dayMode', 'spotPreferences'])
  const sourceType = ctx.request.body.previewId ? 'adopt' : 'generate'
  const result = await createChargedRoute({
    userId,
    payload: ctx.request.body,
    sourceType,
    cost: beanRule.routeCost,
    reason: sourceType === 'adopt' ? '采纳路线消耗' : '生成路线消耗'
  })
  ok(ctx, result)
}

export async function importRouteByLink(ctx) {
  const userId = ctx.state.user.userId
  requireFields(ctx.request.body, ['url'])
  const parsed = parseImportLink(ctx.request.body.url)
  const result = await createChargedRoute({
    userId,
    payload: parsed,
    sourceType: 'import',
    cost: beanRule.importCost,
    reason: '导入路线消耗'
  })
  ok(ctx, { ...result, parsedSpots: result.route.spots.length })
}

export async function listRoutes(ctx) {
  const userId = ctx.state.user.userId
  const routes = await getRouteList(userId)
  
  // 如果用户没有路线，返回官方推荐路线
  if (!routes.length) {
    const officialRoutes = getOfficialRecommendRoutes()
    ok(ctx, { list: officialRoutes, isOfficial: true })
    return
  }
  
  ok(ctx, { list: routes })
}

function getOfficialRecommendRoutes() {
  return [
    {
      id: 'official-1',
      title: '上海治愈系半日游',
      subtitle: '安静散步 · 温柔补能 · 慢节奏周末',
      source_type: 'official',
      goneCount: 328,
      sceneType: 'healing',
      cover: 'https://picsum.photos/seed/healing-route/720/420',
      city: '上海',
      detail: {
        city: '上海',
        spots: [
          { spotId: 1, name: '愚园路', tag: '安静散步', reason: '梧桐树成荫，适合慢走和拍照', duration: '1.5小时' },
          { spotId: 2, name: '静安公园', tag: '自然治愈', reason: '城市绿洲，适合放空和休息', duration: '1小时' },
          { spotId: 3, name: '铜仁路', tag: '安静散步', reason: '小众文艺街区，适合拍照', duration: '1小时' }
        ],
        connections: [
          { distanceMeter: 600, durationMinute: 10 },
          { distanceMeter: 400, durationMinute: 7 }
        ],
        recommendedSpots: [
          { name: 'Ribone Coffee', tag: '咖啡', reason: '安静人少的精品咖啡' },
          { name: '好久不见', tag: '书店', reason: '温馨的小众书店' }
        ]
      }
    },
    {
      id: 'official-2',
      title: '上海社交出片路线',
      subtitle: '咖啡车 · 滨江风 · 轻社交拍照局',
      source_type: 'official',
      goneCount: 217,
      sceneType: 'social',
      cover: 'https://picsum.photos/seed/social-route/720/420',
      city: '上海',
      detail: {
        city: '上海',
        spots: [
          { spotId: 4, name: '徐汇滨江', tag: '拍照出片', reason: '江边日落绝佳机位', duration: '1.5小时' },
          { spotId: 5, name: '油罐艺术中心', tag: '艺术展览', reason: '工业风建筑，拍照超好看', duration: '1.5小时' },
          { spotId: 6, name: '西岸咖啡街', tag: '社交', reason: '网红咖啡店聚集地', duration: '1小时' }
        ],
        connections: [
          { distanceMeter: 800, durationMinute: 12 },
          { distanceMeter: 500, durationMinute: 8 }
        ],
        recommendedSpots: [
          { name: 'M Stand', tag: '咖啡', reason: '网红咖啡，适合拍照' },
          { name: '阿嬷手作', tag: '饮品', reason: '超人气奶茶' }
        ]
      }
    },
    {
      id: 'official-3',
      title: '雨天室内打卡路线',
      subtitle: '室内展览 · 书店 · 热饮回血',
      source_type: 'official',
      goneCount: 156,
      sceneType: 'rainy',
      cover: 'https://picsum.photos/seed/rainy-route/720/420',
      city: '上海',
      detail: {
        city: '上海',
        spots: [
          { spotId: 7, name: '上海当代艺术博物馆', tag: '展览', reason: '免费展览，适合躲雨', duration: '2小时' },
          { spotId: 8, name: '昭和写真馆', tag: '拍照', reason: '日式写真风格，适合拍照', duration: '1小时' },
          { spotId: 9, name: '多抓鱼循环商店', tag: '二手书店', reason: '有趣的二手书店', duration: '0.5小时' }
        ],
        connections: [
          { distanceMeter: 1000, durationMinute: 15 },
          { distanceMeter: 600, durationMinute: 10 }
        ],
        recommendedSpots: [
          { name: '黄油与面包', tag: '烘焙', reason: '热门面包店' },
          { name: 'Manner', tag: '咖啡', reason: '性价比高的咖啡' }
        ]
      }
    },
    {
      id: 'official-4',
      title: '周末轻量探索路线',
      subtitle: '咖啡 · 自然 · 展览 · 轻量探索',
      source_type: 'official',
      goneCount: 445,
      sceneType: 'default',
      cover: 'https://picsum.photos/seed/default-route/720/420',
      city: '上海',
      detail: {
        city: '上海',
        spots: [
          { spotId: 10, name: '乌鲁木齐路', tag: 'citywalk', reason: '小众文艺街道', duration: '1小时' },
          { spotId: 11, name: 'iapm环贸', tag: '购物', reason: '室内商场，适合休息', duration: '1小时' },
          { spotId: 12, name: '衡山路', tag: '夜生活', reason: '梧桐树下，适合晚间散步', duration: '1小时' }
        ],
        connections: [
          { distanceMeter: 700, durationMinute: 11 },
          { distanceMeter: 900, durationMinute: 14 }
        ],
        recommendedSpots: [
          { name: 'Metal Hands', tag: '咖啡', reason: '老牌精品咖啡' },
          { name: '衡山坊', tag: '文艺', reason: '小众文艺聚集地' }
        ]
      }
    }
  ]
}

export async function createRouteDirect(ctx) {
  // 与联调清单兼容：POST /api/v1/routes 走同一生成逻辑
  await generateRoute(ctx)
}

export async function getRoute(ctx) {
  const userId = ctx.state.user.userId
  const routeIdParam = ctx.params.routeId

  // 官方推荐路线（前端传的是 id 如 "official-1"）
  if (String(routeIdParam).startsWith('official-')) {
    const officialRoute = getOfficialRecommendRoutes().find(
      (r) => r.id === routeIdParam
    )
    if (officialRoute) {
      const { detail, isOfficial, ...routeBasic } = officialRoute
      ok(ctx, {
        ...routeBasic,
        isOfficial: true,
        city: detail.city || '',
        dayMode: '',
        spots: detail.spots || [],
        connections: detail.connections || [],
        recommendedSpots: detail.recommendedSpots || [],
        moodTags: [],
        moodWeightApplied: false,
        ragUsed: false,
        detail
      })
      return
    }
  }

  const route = await getRouteDetail(userId, Number(routeIdParam))
  if (!route) throw new BizError(10001, '路线不存在')
  const detail = toJson(route.detail_json, {})
  ok(ctx, {
    ...route,
    routeId: route.id,
    title: route.title,
    subtitle: route.subtitle,
    city: detail.city || '',
    dayMode: detail.dayMode || '',
    spots: detail.spots || [],
    connections: detail.connections || [],
    recommendedSpots: detail.recommendedSpots || [],
    moodWeightApplied: Boolean(detail.moodWeightApplied),
    sourceType: route.source_type || detail.sourceType || '',
    detail
  })
}

export async function removeRoute(ctx) {
  const userId = ctx.state.user.userId
  const routeIdParam = ctx.params.routeId

  // 官方推荐路线不允许删除
  if (String(routeIdParam).startsWith('official-')) {
    throw new BizError(10002, '官方路线无法删除')
  }

  const deleted = await deleteRouteById(userId, Number(routeIdParam))
  if (!deleted) throw new BizError(10001, '路线不存在')
  ok(ctx, { deletedId: deleted.id })
}
