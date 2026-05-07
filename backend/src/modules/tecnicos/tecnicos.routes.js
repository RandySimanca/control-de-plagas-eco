import { Router } from 'express'
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js'
import * as tecnicosController from './tecnicos.controller.js'

const router = Router()

router.use(authenticate, requireAdmin)

router.get('/', tecnicosController.list)
router.get('/:id', tecnicosController.getById)
router.post('/', tecnicosController.create)
router.put('/:id', tecnicosController.update)
router.delete('/:id', tecnicosController.remove)

export default router
