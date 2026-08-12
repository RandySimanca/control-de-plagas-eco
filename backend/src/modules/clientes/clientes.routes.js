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
// Estaciones del cliente
router.get('/:id/estaciones', clientesController.listEstaciones)
router.post('/:id/estaciones', requireAdmin, clientesController.createEstacion)
router.put('/:id/estaciones/:estacion_id', requireAdmin, clientesController.updateEstacion)
router.delete('/:id/estaciones/:estacion_id', requireAdmin, clientesController.deleteEstacion)

export default router
