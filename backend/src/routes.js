import { Router } from 'express'
import authRoutes from './modules/auth/auth.routes.js'
import clientesRoutes from './modules/clientes/clientes.routes.js'
import configuracionRoutes from './modules/configuracion/configuracion.routes.js'
import documentosRoutes from './modules/documentos/documentos.routes.js'
import profilesRoutes from './modules/profiles/profiles.routes.js'
import uploadRoutes from './modules/upload/upload.routes.js'
import operacionesRoutes from './modules/operaciones/operaciones.routes.js'
import productosRoutes from './modules/productos/productos.routes.js'
import productosTecnicosRoutes from './modules/productos/productos.tecnicos.routes.js'

const router = Router()

// Health Check
router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'plagcontrol-api' })
})

// Módulos del API
router.use('/auth', authRoutes)
router.use('/clientes', clientesRoutes)
router.use('/configuracion', configuracionRoutes)
router.use('/documentos-legales', documentosRoutes)
router.use('/profiles', profilesRoutes)
router.use('/upload', uploadRoutes)
router.use('/productos-catalogo', productosRoutes)
router.use('/productos-tecnicos', productosTecnicosRoutes)

// Operational Modules (Unified)
// We mount at /servicios, /ordenes, and /ordenes-servicio for base order management
router.use('/servicios', operacionesRoutes)
router.use('/ordenes', operacionesRoutes)
router.use('/ordenes-servicio', operacionesRoutes)

// We also mount at root to expose sub-resources like /certificados, /solicitudes-servicio, etc.
router.use('/', operacionesRoutes) 

export default router
