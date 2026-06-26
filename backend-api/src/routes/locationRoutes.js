import Router from 'koa-router'
import { authMiddleware } from '../utils/authMiddleware.js'
import { reverseGeocode } from '../services/locationService.js'

const router = new Router({ prefix: '/api/v1/location' })

router.use(authMiddleware)

router.get('/reverse-geocode', async (ctx) => {
  const { lat, lng } = ctx.query
  
  if (!lat || !lng) {
    ctx.status = 400
    ctx.body = { error: '缺少 lat 或 lng 参数' }
    return
  }
  
  const latitude = Number(lat)
  const longitude = Number(lng)
  
  if (isNaN(latitude) || isNaN(longitude)) {
    ctx.status = 400
    ctx.body = { error: '参数格式错误' }
    return
  }
  
  const result = await reverseGeocode(latitude, longitude)
  ctx.body = { result }
})

export default router
