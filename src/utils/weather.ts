/**
 * 天气和位置服务模块
 * 使用 Open-Meteo API（免费、无需 API Key）
 * https://open-meteo.com/
 */

export interface WeatherData {
  temperature: number
  weatherCode: number
  weatherText: string
  weatherEmoji: string
  windSpeed: number
  humidity: number
}

export interface LocationData {
  latitude: number
  longitude: number
  city: string
  district: string
}

// 天气码映射表（Open-Meteo WMO 天气码）
const WEATHER_CODE_MAP: Record<number, { text: string; emoji: string }> = {
  0: { text: '晴', emoji: '☀️' },
  1: { text: '晴间多云', emoji: '🌤️' },
  2: { text: '多云', emoji: '⛅' },
  3: { text: '阴', emoji: '☁️' },
  45: { text: '雾', emoji: '🌫️' },
  48: { text: '霜雾', emoji: '🌫️' },
  51: { text: '小毛毛雨', emoji: '🌧️' },
  53: { text: '中毛毛雨', emoji: '🌧️' },
  55: { text: '大毛毛雨', emoji: '🌧️' },
  56: { text: '冻毛毛雨', emoji: '🌧️' },
  57: { text: '强冻毛毛雨', emoji: '🌧️' },
  61: { text: '小雨', emoji: '🌧️' },
  63: { text: '中雨', emoji: '🌧️' },
  65: { text: '大雨', emoji: '🌧️' },
  66: { text: '冻雨', emoji: '🌧️' },
  67: { text: '强冻雨', emoji: '🌧️' },
  71: { text: '小雪', emoji: '🌨️' },
  73: { text: '中雪', emoji: '🌨️' },
  75: { text: '大雪', emoji: '❄️' },
  77: { text: '雪粒', emoji: '🌨️' },
  80: { text: '小阵雨', emoji: '🌦️' },
  81: { text: '中阵雨', emoji: '🌦️' },
  82: { text: '大阵雨', emoji: '🌦️' },
  85: { text: '小阵雪', emoji: '🌨️' },
  86: { text: '大阵雪', emoji: '🌨️' },
  95: { text: '雷暴', emoji: '⛈️' },
  96: { text: '雷暴加冰雹', emoji: '⛈️' },
  99: { text: '强雷暴加冰雹', emoji: '⛈️' }
}

// 南昌坐标（用户所在城市）
const NANCHANG_COORDS: [number, number] = [28.68202, 115.85794]

// 中国主要城市经纬度映射（用于默认显示）
const CHINA_CITIES: Record<string, [number, number]> = {
  '南昌': NANCHANG_COORDS,
  '北京': [39.9042, 116.4074],
  '上海': [31.2304, 121.4737],
  '广州': [23.1291, 113.2644],
  '深圳': [22.5431, 114.0579],
  '杭州': [30.2741, 120.1551],
  '成都': [30.5728, 104.0668],
  '重庆': [29.4316, 106.9123],
  '武汉': [30.5928, 114.3055],
  '西安': [34.3416, 108.9398],
  '南京': [32.0603, 118.7969],
  '天津': [39.3434, 117.3616],
  '苏州': [31.2989, 120.5853],
  '郑州': [34.7466, 113.6253],
  '长沙': [28.2282, 112.9388],
  '沈阳': [41.8057, 123.4328],
  '青岛': [36.0671, 120.3826],
  '济南': [36.6512, 117.1201],
  '大连': [38.9140, 121.6147],
  '厦门': [24.4798, 118.0894],
  '昆明': [25.0406, 102.7129]
}

// 默认城市（南昌）
const DEFAULT_CITY = '南昌'

// 根据坐标获取城市名称（不使用外部API，直接匹配）
function getCityFromCoords(latitude: number, longitude: number): string {
  // 检查是否接近南昌
  if (Math.abs(latitude - 28.68202) < 0.5 && Math.abs(longitude - 115.85794) < 0.5) {
    return '南昌'
  }
  // 检查是否接近其他预设城市
  for (const [city, [lat, lon]] of Object.entries(CHINA_CITIES)) {
    if (Math.abs(latitude - lat) < 0.3 && Math.abs(longitude - lon) < 0.3) {
      return city
    }
  }
  return DEFAULT_CITY
}

/**
 * 根据经纬度获取城市名称（使用预设映射，不调用外部API）
 */
export async function getCityName(latitude: number, longitude: number): Promise<string> {
  return getCityFromCoords(latitude, longitude)
}

/**
 * 获取当前位置信息
 */
export function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve) => {
    uni.getLocation({
      type: 'gcj02',
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude
        })
      },
      fail: (err) => {
        // 如果获取定位失败（模拟器中常见），使用南昌坐标
        console.warn('获取定位失败（模拟器中正常），使用默认位置南昌:', err)
        resolve({ latitude: NANCHANG_COORDS[0], longitude: NANCHANG_COORDS[1] })
      }
    })
  })
}

/**
 * 获取天气数据（通过经纬度）
 */
export async function getWeatherByCoordinates(latitude: number, longitude: number): Promise<WeatherData> {
  try {
    const response = await uni.request({
      url: 'https://api.open-meteo.com/v1/forecast',
      method: 'GET',
      data: {
        latitude,
        longitude,
        current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
        timezone: 'Asia/Shanghai'
      }
    })

    const data = response.data as any
    if (data && data.current) {
      const current = data.current
      const weatherInfo = WEATHER_CODE_MAP[current.weather_code] || {
        text: '未知',
        emoji: '❓'
      }

      return {
        temperature: Math.round(current.temperature_2m),
        weatherCode: current.weather_code,
        weatherText: weatherInfo.text,
        weatherEmoji: weatherInfo.emoji,
        windSpeed: Math.round(current.wind_speed_10m),
        humidity: Math.round(current.relative_humidity_2m)
      }
    }

    throw new Error('天气数据解析失败')
  } catch (error) {
    console.error('获取天气失败:', error)
    // 返回默认天气数据
    return {
      temperature: 22,
      weatherCode: 0,
      weatherText: '晴',
      weatherEmoji: '☀️',
      windSpeed: 0,
      humidity: 50
    }
  }
}

/**
 * 获取天气数据（通过城市名称）
 */
export async function getWeatherByCity(cityName: string): Promise<WeatherData> {
  const coords = CHINA_CITIES[cityName]
  if (coords) {
    return getWeatherByCoordinates(coords[0], coords[1])
  }

  // 如果城市不在列表中，尝试使用地理编码 API
  try {
    const geoResponse = await uni.request({
      url: 'https://nominatim.openstreetmap.org/search',
      method: 'GET',
      data: {
        q: `${cityName}, China`,
        format: 'json',
        limit: 1
      },
      header: {
        'User-Agent': 'PocketTravelCompanion/1.0'
      }
    })

    const geoData = geoResponse.data as any[]
    if (geoData && geoData.length > 0) {
      const lat = parseFloat(geoData[0].lat)
      const lon = parseFloat(geoData[0].lon)
      return getWeatherByCoordinates(lat, lon)
    }
  } catch (error) {
    console.warn('地理编码失败:', error)
  }

  // 默认返回上海天气
  const [lat, lon] = CHINA_CITIES[DEFAULT_CITY]
  return getWeatherByCoordinates(lat, lon)
}

/**
 * 获取位置和天气信息（综合函数）
 */
export async function getLocationAndWeather(): Promise<{
  location: LocationData
  weather: WeatherData
  displayText: string
}> {
  // 获取当前位置
  const { latitude, longitude } = await getCurrentLocation()

  // 并行获取城市名和天气
  const [cityName, weather] = await Promise.all([
    getCityName(latitude, longitude),
    getWeatherByCoordinates(latitude, longitude)
  ])

  const location: LocationData = {
    latitude,
    longitude,
    city: cityName,
    district: ''
  }

  const displayText = `${cityName} · ${weather.weatherEmoji} ${weather.temperature}℃`

  return { location, weather, displayText }
}

/**
 * 根据城市名获取展示文本
 */
export async function getCityWeatherText(cityName: string): Promise<string> {
  const weather = await getWeatherByCity(cityName)
  return `${cityName} · ${weather.weatherEmoji} ${weather.temperature}℃`
}
