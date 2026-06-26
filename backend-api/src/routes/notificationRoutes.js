import Router from 'koa-router'
import { authMiddleware } from '../utils/authMiddleware.js'
import { getNotifications, markAsRead, markAllRead } from '../controllers/notificationController.js'

const router = new Router({ prefix: '/api/v1/notifications' })

router.use(authMiddleware)
router.get('/', getNotifications)
router.post('/:id/read', markAsRead)
router.post('/read-all', markAllRead)

export default router
