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
router.post('/:id/estaciones', clientesController.createEstacion)
router.put('/:id/estaciones/:estacion_id', requireAdmin, clientesController.updateEstacion)
router.delete('/:id/estaciones/:estacion_id', requireAdmin, clientesController.deleteEstacion)

// Sedes
router.get('/:id/sedes', clientesController.listSedes)
router.post('/:id/sedes', clientesController.createSede)
router.put('/:id/sedes/:sede_id', requireAdmin, clientesController.updateSede)
router.delete('/:id/sedes/:sede_id', clientesController.deleteSede)

export default router
