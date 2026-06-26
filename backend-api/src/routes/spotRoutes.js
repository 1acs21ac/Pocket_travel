import Router from 'koa-router'
import { authMiddleware } from '../utils/authMiddleware.js'
import {
  createSpotCheckin,
  createSpotComment,
  getSpotDetail,
  likeSpotComment,
  listSpotComments,
  listSpots,
  markSpotFavorite,
  updateSpotAddressController
} from '../controllers/spotController.js'

const router = new Router({ prefix: '/api/v1/spots' })

router.use(authMiddleware)
router.get('/', listSpots)
router.get('/:spotId', getSpotDetail)
router.put('/:spotId/address', updateSpotAddressController)
router.post('/:spotId/favorite', markSpotFavorite)
router.post('/:spotId/checkins', createSpotCheckin)
router.post('/:spotId/comments', createSpotComment)
router.get('/:spotId/comments', listSpotComments)
router.post('/:spotId/comments/:commentId/like', likeSpotComment)

export default router
