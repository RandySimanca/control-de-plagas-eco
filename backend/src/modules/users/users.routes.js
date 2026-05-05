import { Router } from 'express'
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js'
import * as usersController from './users.controller.js'

const router = Router()

router.use(authenticate, requireAdmin)

router.get('/', usersController.list)
router.get('/:id', usersController.getById)

export default router
