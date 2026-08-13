import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import * as controller from './operaciones.controller.js'

const router = Router()

router.use(authenticate)

// 1. Static/Specific Routes FIRST (to avoid being captured by /:id)
// These ensure that specific path names are not treated as UUIDs
router.get('/solicitudes-servicio/count', controller.countSolicitudes)
router.get('/solicitudes-servicio', controller.listSolicitudes)
router.post('/solicitudes-servicio', controller.createSolicitud)
router.patch('/solicitudes-servicio/:id', controller.updateSolicitud)
router.delete('/solicitudes-servicio/:id', controller.deleteSolicitud)

router.get('/certificados', controller.listCertificados)
router.post('/certificados', controller.createCertificado)
router.put('/certificados/:id', controller.updateCertificado)
router.patch('/certificados/:id/aprobar', controller.aprobarCertificado)
router.patch('/certificados/:id/rechazar', controller.rechazarCertificado)

// Explicit routes for compatibility with older endpoints are now handled by routes.js mounts

router.get('/actividades-servicio', controller.listActividades)
router.post('/actividades-servicio', controller.createActividad)
router.patch('/actividades-servicio/:id', controller.updateActividad)
router.delete('/actividades-servicio/:id', controller.deleteActividad)

router.get('/fotos-servicio', controller.listFotos)
router.post('/fotos-servicio', controller.createFoto)
router.delete('/fotos-servicio/:id', controller.deleteFoto)

router.get('/estaciones-usadas', controller.listEstaciones)
router.post('/estaciones-usadas', controller.createEstacion)
router.patch('/estaciones-usadas/:id', controller.updateEstacion)
router.delete('/estaciones-usadas/:id', controller.deleteEstacion)
router.delete('/estaciones-usadas', controller.deleteEstacionesByOrden)

router.get('/productos-usados', controller.listProductos)
router.post('/productos-usados', controller.createProducto)
router.patch('/productos-usados/:id', controller.updateProducto)
router.delete('/productos-usados/:id', controller.deleteProducto)

// Lavado de tanques rutas estáticas
router.post('/tanques', controller.createTanque)
router.patch('/tanques/:id', controller.updateTanque)
router.put('/tanques/:id', controller.updateTanque)
router.delete('/tanques/:id', controller.deleteTanque)

router.post('/bitacora-tanques', controller.createBitacoraTanque)
router.patch('/bitacora-tanques/:id', controller.updateBitacoraTanque)
router.put('/bitacora-tanques/:id', controller.updateBitacoraTanque)
router.delete('/bitacora-tanques/:id', controller.deleteBitacoraTanque)

router.post('/fotos-bitacora-tanques', controller.createFotoBitacoraTanque)
router.delete('/fotos-bitacora-tanques/:id', controller.deleteFotoBitacoraTanque)

router.post('/fotos-estaciones', controller.createFotoEstacion)
router.delete('/fotos-estaciones/:id', controller.deleteFotoEstacion)

router.get('/relevamientos', controller.getRelevamientoByOrdenQuery)
router.post('/relevamientos', controller.upsertRelevamiento)
router.post('/fotos-relevamiento', controller.createFotoRelevamiento)
router.patch('/fotos-relevamiento/:id', controller.updateFotoRelevamiento)
router.delete('/fotos-relevamiento/:id', controller.deleteFotoRelevamiento)

// 2. Base routes for when mounted at /ordenes or /servicios (Relative paths)
router.get('/', controller.listOrdenes)
router.post('/', controller.createOrden)

// 3. Parameterized Routes LAST
router.get('/:id', controller.getOrdenDetalle)
router.patch('/:id', controller.updateOrden)
router.put('/:id', controller.updateOrden)
router.delete('/:id', controller.deleteOrden)
router.post('/:id/assign', controller.assignOrden)

// 4. Sub-resources
router.get('/:id/productos', controller.getProductosByOrden)
router.get('/:id/fotos', controller.getFotosByOrden)
router.get('/:id/actividades', controller.getActividadesByOrden)
router.get('/:id/estaciones', controller.getEstacionesByOrden)
router.get('/:id/certificado', controller.getLatestCertificadoByOrden)
router.get('/:id/relevamiento', controller.getRelevamientoByOrden)
router.get('/:id/tanques', controller.getTanquesByOrden)

export default router
