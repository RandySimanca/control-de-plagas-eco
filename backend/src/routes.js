import { Router } from 'express'
import authRoutes from './modules/auth/auth.routes.js'
import usersRoutes from './modules/users/users.routes.js'
import clientesRoutes from './modules/clientes/clientes.routes.js'
import tecnicosRoutes from './modules/tecnicos/tecnicos.routes.js'
import ordenesRoutes from './modules/ordenes/ordenes.routes.js'
import configuracionRoutes from './modules/configuracion/configuracion.routes.js'
import documentosRoutes from './modules/documentos/documentos.routes.js'
import profilesRoutes from './modules/profiles/profiles.routes.js'
import uploadRoutes from './modules/upload/upload.routes.js'
import operacionesRoutes from './modules/operaciones/operaciones.routes.js'

const router = Router()

// Health Check
router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'plagcontrol-api' })
})

// Módulos del API
router.use('/auth', authRoutes)
router.use('/users', usersRoutes)
router.use('/clientes', clientesRoutes)
router.use('/tecnicos', tecnicosRoutes)
router.use('/servicios', ordenesRoutes) // Manteniendo URL para el front, pero usando módulo ordenes
router.use('/configuracion', configuracionRoutes)
router.use('/documentos-legales', documentosRoutes)
router.use('/profiles', profilesRoutes)
router.use('/upload', uploadRoutes)

// Nota: operacionesRoutes y profilesRoutes deberían tener sus propios archivos .routes.js 
// para seguir el patrón, pero por ahora mantenemos compatibilidad.

export default router
