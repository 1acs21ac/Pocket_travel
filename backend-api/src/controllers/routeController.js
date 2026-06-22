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
  ok(ctx, { list: routes })
}

export async function createRouteDirect(ctx) {
  // 与联调清单兼容：POST /api/v1/routes 走同一生成逻辑
  await generateRoute(ctx)
}

export async function getRoute(ctx) {
  const userId = ctx.state.user.userId
  const route = await getRouteDetail(userId, Number(ctx.params.routeId))
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
  const deleted = await deleteRouteById(userId, Number(ctx.params.routeId))
  if (!deleted) throw new BizError(10001, '路线不存在')
  ok(ctx, { deletedId: deleted.id })
}
