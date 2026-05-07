import { Router } from 'express'
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js'
import * as serviciosController from './servicios.controller.js'

const router = Router()

router.use(authenticate)

router.get('/', serviciosController.list)
router.get('/:id', serviciosController.getById)
router.post('/', requireAdmin, serviciosController.create)
router.put('/:id', serviciosController.update)
router.post('/:id/assign', requireAdmin, serviciosController.assign)
router.delete('/:id', requireAdmin, serviciosController.remove)

export default router
