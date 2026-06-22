import { ok } from '../utils/response.js'
import { requireFields } from '../utils/validate.js'
import { getMoodProfile, saveMoodProfile } from '../models/moodModel.js'
import { getDb } from '../models/db.js'
import { addBeanLog, claimDailyRewardTx, getBeanBalanceTx, updateBeanBalanceTx } from '../models/beanModel.js'
import { beanRule, clampBeanBalance } from '../utils/beanRule.js'

function extractMoodTags(answers) {
  // 情绪标签提取占位逻辑：后续可由模型/规则引擎替换
  const moodAnswer = answers.find((x) => x.questionNo === 2)
  return moodAnswer?.values?.slice(0, 3) || ['放松中']
}

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

export async function submitMoodMap(ctx) {
  requireFields(ctx.request.body, ['answers'])
  const { answers, rewardExpected = true } = ctx.request.body
  const userId = ctx.state.user.userId
  const moodTags = extractMoodTags(answers)
  await saveMoodProfile(userId, answers, moodTags)

  let rewardBeans = 0
  let rewardGranted = false
  let balance
  if (rewardExpected) {
    const connection = await getDb().getConnection()
    try {
      await connection.beginTransaction()
      const claimed = await claimDailyRewardTx(connection, { userId, rewardType: 'mood_update' })
      const currentBalance = await getBeanBalanceTx(connection, userId, { lock: true })
      const nextBalance = claimed ? clampBeanBalance(currentBalance + beanRule.moodUpdateReward) : currentBalance
      rewardBeans = nextBalance - currentBalance
      rewardGranted = rewardBeans > 0
      balance = nextBalance
      if (rewardGranted) {
        await updateBeanBalanceTx(connection, userId, nextBalance)
        await addBeanLog(connection, { userId, delta: rewardBeans, reason: '更新情绪地图奖励' })
      }
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  ok(ctx, {
    moodTags,
    rewardBeans,
    rewardGranted,
    balance,
    updatedAt: new Date().toISOString()
  })
}

export async function getMoodMapProfile(ctx) {
  const userId = ctx.state.user.userId
  const profile = await getMoodProfile(userId)
  ok(ctx, {
    socialIdentity: '未设置',
    moodTags: profile ? toJson(profile.mood_tags_json, []) : [],
    travelRhythm: [],
    lastUpdatedAt: profile?.updated_at || null
  })
}

export async function quickAdjustMood(ctx) {
  requireFields(ctx.request.body, ['moodTags'])
  const userId = ctx.state.user.userId
  const profile = await getMoodProfile(userId)
  const answers = profile ? toJson(profile.answers_json, []) : []
  await saveMoodProfile(userId, answers, ctx.request.body.moodTags)
  ok(ctx, { moodTags: ctx.request.body.moodTags })
}
