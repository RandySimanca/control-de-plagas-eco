import { Router } from 'express'
import authRoutes from './modules/auth/auth.routes.js'
import usersRoutes from './modules/users/users.routes.js'
import clientesRoutes from './modules/clientes/clientes.routes.js'
import tecnicosRoutes from './modules/tecnicos/tecnicos.routes.js'
import serviciosRoutes from './modules/servicios/servicios.routes.js'
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
router.use('/servicios', serviciosRoutes)
router.use('/configuracion', configuracionRoutes)
router.use('/documentos-legales', documentosRoutes)
router.use('/profiles', profilesRoutes)
router.use('/upload', uploadRoutes)

// Rutas de Operaciones (Órdenes, Fotos, etc.)
router.use('/', operacionesRoutes)

export default router
