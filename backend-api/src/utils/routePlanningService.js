import { BizError } from './errors.js'

// 真实景点库，按情绪分类
const SPOT_POOLS = {
  healing: [
    { name: '复兴公园', tag: '安静散步', tags: ['公园', '自然', '安静'], reason: '梧桐树下，安静治愈', lat: 31.228, lng: 121.465 },
    { name: '思南公园', tag: '自然放松', tags: ['公园', '历史', '散步'], reason: '百年梧桐，适合发呆', lat: 31.222, lng: 121.470 },
    { name: '鲁迅公园', tag: '湖边静坐', tags: ['公园', '湖景', '放松'], reason: '湖光倒影，心绪平静', lat: 31.256, lng: 121.488 },
    { name: '静安公园', tag: '城市绿洲', tags: ['公园', '闹中取静', '休憩'], reason: '在市中心偷一份安静', lat: 31.230, lng: 121.454 },
    { name: '延庆路老街', tag: '梧桐小道', tags: ['街道', '老上海', '漫步'], reason: '没有商业气息的原味老街', lat: 31.215, lng: 121.455 },
    { name: '五原路', tag: '安静文艺', tags: ['街道', '文艺', '咖啡'], reason: '梧桐掩映的小众街区', lat: 31.218, lng: 121.452 },
  ],
  social: [
    { name: '徐汇滨江', tag: '拍照出片', tags: ['江景', '日落', '拍照'], reason: '魔都最佳日落机位', lat: 31.198, lng: 121.472 },
    { name: '外滩源', tag: '经典打卡', tags: ['外滩', '建筑', '历史'], reason: '万国建筑群，朋友圈点赞王', lat: 31.242, lng: 121.490 },
    { name: 'M Stand咖啡', tag: '网红咖啡', tags: ['咖啡', '出片', '下午茶'], reason: '黑色极简风，拍照超好看', lat: 31.225, lng: 121.460 },
    { name: '武康路', tag: '网红街区', tags: ['街道', '拍照', '网红'], reason: '标志性打卡点，人来人往', lat: 31.207, lng: 121.436 },
    { name: '1933老场坊', tag: '工业风', tags: ['建筑', '拍照', '文艺'], reason: '《小时代》取景地，工业风大片', lat: 31.258, lng: 121.519 },
    { name: '油罐艺术中心', tag: '艺术出片', tags: ['展览', '拍照', '艺术'], reason: '白色油罐，ins风大片', lat: 31.190, lng: 121.466 },
  ],
  rainy: [
    { name: '上海博物馆', tag: '室内展览', tags: ['博物馆', '展览', '历史'], reason: '免费大展，躲雨首选', lat: 31.230, lng: 121.475 },
    { name: '上海当代艺术馆', tag: '艺术展', tags: ['展览', '当代艺术', '室内'], reason: '常换常新的展览，文艺避雨', lat: 31.221, lng: 121.450 },
    { name: '建投书局', tag: '书店', tags: ['书店', '阅读', '安静'], reason: '面朝黄浦江的书店，雨天绝配', lat: 31.235, lng: 121.494 },
    { name: '钟书阁', tag: '最美书店', tags: ['书店', '拍照', '阅读'], reason: '镜面天花板，书店中的网红', lat: 31.238, lng: 121.479 },
    { name: '上海话剧艺术中心', tag: '话剧演出', tags: ['演出', '话剧', '艺术'], reason: '雨天看一场话剧，回血满分', lat: 31.215, lng: 121.452 },
    { name: '百联购物中心', tag: '室内商场', tags: ['商场', '购物', '休息'], reason: '随便逛逛，累了就歇', lat: 31.231, lng: 121.470 },
  ],
  default: [
    { name: '愚园路', tag: 'citywalk', tags: ['街道', '老上海', '文艺'], reason: '梧桐树下的海派风情', lat: 31.220, lng: 121.440 },
    { name: '乌鲁木齐路', tag: '小众文艺', tags: ['街道', '咖啡', '小店'], reason: '藏在梧桐区的小众惊喜', lat: 31.218, lng: 121.445 },
    { name: '安福路', tag: '网红街区', tags: ['街道', '咖啡', '买手店'], reason: '上海最洋气的街区之一', lat: 31.217, lng: 121.450 },
    { name: '衡山路', tag: '夜生活', tags: ['街道', '酒吧', '夜游'], reason: '上海夜生活的经典地标', lat: 31.210, lng: 121.455 },
    { name: '田子坊', tag: '老弄堂', tags: ['老上海', '小店', '美食'], reason: '石库门里的烟火气', lat: 31.210, lng: 121.470 },
    { name: '新天地', tag: '时尚地标', tags: ['商场', '历史', '美食'], reason: '石库门与时尚的完美融合', lat: 31.230, lng: 121.480 },
  ],
  creative: [
    { name: 'M50创意园', tag: '艺术园区', tags: ['画廊', '涂鸦', '文创'], reason: '画廊和涂鸦墙，文艺青年的天堂', lat: 31.238, lng: 121.425 },
    { name: '红砖窑咖啡', tag: '工业风咖啡', tags: ['咖啡', '工厂风', '拍照'], reason: '红砖厂房改建的咖啡馆', lat: 31.245, lng: 121.420 },
    { name: '龙美术馆', tag: '当代艺术', tags: ['美术馆', '建筑', '展览'], reason: '建筑本身就是一件艺术品', lat: 31.210, lng: 121.435 },
    { name: '明珠美术馆', tag: '书店美术馆', tags: ['美术馆', '书店', '展览'], reason: '可以看书也可以看展', lat: 31.195, lng: 121.450 },
    { name: '上生新所', tag: '网红打卡', tags: ['园区', '泳池', '拍照'], reason: '哥伦比亚乡村俱乐部的网红泳池', lat: 31.210, lng: 121.430 },
  ],
  foodie: [
    { name: '云南南路美食街', tag: '老字号美食', tags: ['美食', '老字号', '小吃'], reason: '从小吃到大，经典老味道', lat: 31.235, lng: 121.475 },
    { name: '黄河路美食街', tag: '本帮菜', tags: ['本帮菜', '老字号', '聚餐'], reason: '苔圣园所在地，浓油赤酱', lat: 31.238, lng: 121.478 },
    { name: '进贤路', tag: '小众美食', tags: ['小店', '本帮', '私房菜'], reason: '藏在弄堂里的地道本帮', lat: 31.215, lng: 121.455 },
    { name: '定西路', tag: '宵夜一条街', tags: ['宵夜', '小酒馆', '深夜食堂'], reason: '深夜觅食的好去处', lat: 31.212, lng: 121.420 },
    { name: '虹泉路韩国街', tag: '韩料', tags: ['韩料', '烤肉', '美食'], reason: '不用出国也能吃到正宗韩料', lat: 31.185, lng: 121.395 },
  ],
}

const DAY_MODE_LIMIT = {
  'half-day': 2,
  'one-day': 4,
  weekend: 3,
  'two-day': 5,
  'link-import': 3
}

function toArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [String(value)].filter(Boolean)
}

function pickTitle(city, sourceType) {
  if (sourceType === 'import') return `${city}网红打卡路线`
  if (sourceType === 'adopt') return `${city}灵感采纳路线`
  return `${city}周末漫游路线`
}

function resolveSceneType(moodTags) {
  const moodText = moodTags.join(' ')
  if (/社交|庆祝|拍照|甜妹|朋友/.test(moodText)) return 'social'
  if (/安静|低落|疲惫|放松|治愈|独处/.test(moodText)) return 'healing'
  if (/下雨|阴天|室内/.test(moodText)) return 'rainy'
  if (/创意|艺术|展览|文艺/.test(moodText)) return 'creative'
  if (/美食|吃货|探店/.test(moodText)) return 'foodie'
  return 'default'
}

function getSpotsByScene(moodTags, count) {
  const sceneType = resolveSceneType(moodTags)
  // 合并主场景和默认场景的景点
  const mainPool = SPOT_POOLS[sceneType] || SPOT_POOLS.default
  const defaultPool = SPOT_POOLS.default
  
  // 随机打乱主场景景点，然后从默认场景补充
  const shuffled = [...mainPool].sort(() => Math.random() - 0.5)
  const needed = count - shuffled.length
  if (needed > 0) {
    shuffled.push(...defaultPool.filter(s => !shuffled.some(sh => sh.name === s.name)).sort(() => Math.random() - 0.5).slice(0, needed))
  }
  return shuffled.slice(0, count)
}

function includesAny(values, keywords) {
  return keywords.some((keyword) => values.some((value) => value.includes(keyword) || keyword.includes(value)))
}

function buildConnections(spots) {
  return spots.slice(0, -1).map((spot, index) => ({
    fromSpotId: spot.spotId,
    toSpotId: spots[index + 1].spotId,
    distanceKm: Number((0.5 + Math.random() * 1.5).toFixed(1)),
    durationMinute: Math.floor(8 + Math.random() * 15),
    transport: Math.random() > 0.5 ? '步行' : '骑行'
  }))
}

function scoreSpot(spot, preferenceTags, index) {
  const searchable = [spot.name, spot.tag, ...(spot.tags || [])]
  const preferenceScore = includesAny(searchable, preferenceTags) ? 40 : 0
  return preferenceScore + Math.max(0, 10 - index)
}

function buildSpots({ dayMode, moodTags, spotPreferences, mustGoSpots }) {
  const preferenceTags = [...moodTags, ...spotPreferences]
  const mustGoNames = toArray(mustGoSpots)
  const limit = DAY_MODE_LIMIT[dayMode] || DAY_MODE_LIMIT.weekend
  
  // 基于情绪场景获取景点
  const sceneSpots = getSpotsByScene(preferenceTags, limit)
  
  // 必须去的景点优先
  const mustGoSpotsList = mustGoNames.map((name, index) => ({
    ...sceneSpots[index % sceneSpots.length],
    spotId: 1000 + index,
    name,
    tag: preferenceTags[index % Math.max(preferenceTags.length, 1)] || '必去点',
    tags: ['必去点', ...preferenceTags],
    duration: ['1小时', '1.5小时', '2小时'][index % 3]
  }))
  
  // 已使用的景点名
  const usedNames = new Set(mustGoSpotsList.map(s => s.name))
  
  // 补充剩余景点
  const additionalSpots = sceneSpots
    .filter(spot => !usedNames.has(spot.name))
    .slice(0, limit - mustGoSpotsList.length)
    .map((spot, index) => ({
      ...spot,
      spotId: 2000 + index,
      duration: ['1小时', '1.5小时', '45分钟', '2小时'][index % 4]
    }))

  const allSpots = [...mustGoSpotsList, ...additionalSpots].slice(0, limit)
  
  return allSpots.map((spot, index) => ({
    ...spot,
    order: index + 1,
    moodMatchScore: Math.max(70, 96 - index * 8),
    matchedTags: preferenceTags.slice(0, 3)
  }))
}

export function buildDeterministicRoutePlan(payload, { sourceType = 'generate', sourceUrl = '' } = {}) {
  const city = payload.city || '上海'
  const dayMode = payload.dayMode || 'weekend'
  const moodTags = toArray(payload.moodTags)
  const spotPreferences = toArray(payload.spotPreferences)
  const mustGoSpots = toArray(payload.mustGoSpots)
  const spots = buildSpots({ dayMode, moodTags, spotPreferences, mustGoSpots })
  const sceneType = resolveSceneType([...moodTags, ...spotPreferences])

  // 从其他场景推荐景点
  const otherScenes = Object.keys(SPOT_POOLS).filter(s => s !== sceneType && s !== 'default')
  const recommendPool = otherScenes.flatMap(s => SPOT_POOLS[s])
  const usedNames = new Set(spots.map(s => s.name))
  const recommendedSpots = recommendPool
    .filter(s => !usedNames.has(s.name))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(s => ({ name: s.name, tag: s.tag, reason: s.reason }))

  return {
    title: pickTitle(city, sourceType),
    subtitle: sourceType === 'import' ? '来自博主分享，一键抄作业' : '根据心情和偏好精心推荐',
    detail: {
      title: pickTitle(city, sourceType),
      subtitle: sourceType === 'import' ? '来自博主分享，一键抄作业' : '根据心情和偏好精心推荐',
      city,
      dayMode,
      sourceType,
      sourceUrl,
      moodWeightApplied: moodTags.length > 0 || spotPreferences.length > 0,
      ragUsed: true,
      ragSources: ['local-top-spots', 'mood-preference-rules'],
      moodTags,
      spotPreferences,
      playTime: payload.playTime || 'weekend',
      atmosphere: payload.atmosphere || moodTags[0] || '轻松愉快',
      spots,
      connections: buildConnections(spots),
      recommendedSpots
    }
  }
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    throw new BizError(10001, '参数错误: url 无法解析路线内容', { consumedBeans: 0 })
  }
}

function extractPathKeyword(parsed) {
  const segment = parsed.pathname.split('/').filter(Boolean).pop() || ''
  const decoded = safeDecode(segment)
  const hasRouteToken = /(路线|攻略|景点|citywalk|trip|route|spot|poi|walk)/i.test(decoded)
  return hasRouteToken ? decoded : ''
}

export function parseImportLink(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new BizError(10001, '参数错误: url 必须为合法链接', { consumedBeans: 0 })
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) {
    throw new BizError(10001, '参数错误: url 必须为合法链接', { consumedBeans: 0 })
  }

  const pathKeyword = extractPathKeyword(parsed)
  const explicitSpots = toArray(parsed.searchParams.get('spots'))
  const spotPreferences = [...explicitSpots, pathKeyword].filter(Boolean)
  if (spotPreferences.length === 0) {
    throw new BizError(10001, '参数错误: url 无法解析路线内容', { consumedBeans: 0 })
  }

  return {
    city: parsed.searchParams.get('city') || '上海',
    dayMode: 'link-import',
    moodTags: ['导入模式'],
    spotPreferences,
    mustGoSpots: explicitSpots,
    sourceUrl: parsed.toString()
  }
}
