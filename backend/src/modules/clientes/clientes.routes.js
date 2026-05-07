import { Router } from 'express'
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js'
import * as clientesController from './clientes.controller.js'

const router = Router()

router.use(authenticate)

// Lectura: admin y técnico
router.get('/', clientesController.list)
router.get('/:id', clientesController.getById)

// Escritura: solo admin
router.post('/', requireAdmin, clientesController.create)
router.put('/:id', requireAdmin, clientesController.update)
router.delete('/:id', requireAdmin, clientesController.remove)

export default router
