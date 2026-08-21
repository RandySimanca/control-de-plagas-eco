import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import * as productosTecnicosController from './productos.tecnicos.controller.js'

const router = Router()

router.use(authenticate)

// Obtener el inventario actual del técnico logueado (o de un ID específico si es admin)
router.get('/:tecnico_id?', productosTecnicosController.getInventarioTecnico)

// El técnico saca productos de bodega (Check-out)
router.post('/check-out', productosTecnicosController.checkOutProductos)

// El técnico devuelve productos a bodega (Check-in)
router.post('/check-in', productosTecnicosController.checkInProductos)

export default router
