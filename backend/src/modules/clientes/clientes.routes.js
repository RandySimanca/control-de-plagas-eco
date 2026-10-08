import { Router } from 'express'
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js'
import * as clientesController from './clientes.controller.js'

const router = Router()

// El técnico puede ubicar estaciones en el plano (solo plano_id/pos_x/pos_y); el resto es solo admin
const CAMPOS_POSICION = new Set(['plano_id', 'pos_x', 'pos_y'])
function adminOTecnicoPosicion (req, res, next) {
  if (req.user.role === 'admin') return next()
  if (req.user.role === 'tecnico') {
    const keys = Object.keys(req.body || {})
    if (keys.length > 0 && keys.every(k => CAMPOS_POSICION.has(k))) return next()
  }
  return res.status(403).json({ success: false, message: 'Solo administradores' })
}

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
router.put('/:id/estaciones/:estacion_id', adminOTecnicoPosicion, clientesController.updateEstacion)
router.delete('/:id/estaciones/:estacion_id', requireAdmin, clientesController.deleteEstacion)

// Sedes
router.get('/:id/sedes', clientesController.listSedes)
router.post('/:id/sedes', clientesController.createSede)
router.put('/:id/sedes/:sede_id', requireAdmin, clientesController.updateSede)
router.delete('/:id/sedes/:sede_id', clientesController.deleteSede)

// Planos / croquis de sede
router.get('/:id/planos', clientesController.listPlanos)
router.post('/:id/planos', clientesController.createPlano)
router.delete('/:id/planos/:plano_id', clientesController.deletePlano)

export default router
