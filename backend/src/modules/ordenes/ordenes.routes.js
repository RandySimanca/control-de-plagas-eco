import { Router } from 'express'
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js'
import * as ordenesController from './ordenes.controller.js'

const router = Router()

router.use(authenticate)

router.get('/', ordenesController.list)
router.get('/:id', ordenesController.getById)
router.post('/', requireAdmin, ordenesController.create)
router.put('/:id', ordenesController.update)
router.post('/:id/assign', requireAdmin, ordenesController.assign)
router.delete('/:id', requireAdmin, ordenesController.remove)

export default router
