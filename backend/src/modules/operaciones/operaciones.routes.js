import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import * as controller from './operaciones.controller.js'

const router = Router()

router.use(authenticate)

// Base routes (will be mounted at /ordenes and /servicios)
router.get('/', controller.listOrdenes)
router.post('/', controller.createOrden)
router.get('/:id', controller.getOrdenDetalle)
router.patch('/:id', controller.updateOrden)
router.put('/:id', controller.updateOrden)
router.delete('/:id', controller.deleteOrden)
router.post('/:id/assign', controller.assignOrden)

// Sub-resources
router.get('/:id/productos', controller.getProductosByOrden)
router.get('/:id/fotos', controller.getFotosByOrden)
router.get('/:id/actividades', controller.getActividadesByOrden)
router.get('/:id/estaciones', controller.getEstacionesByOrden)
router.get('/:id/certificado', controller.getLatestCertificadoByOrden)

// Shared operational endpoints (will be mounted at root or specific paths)
router.get('/certificados', controller.listCertificados)
router.post('/certificados', controller.createCertificado)
router.put('/certificados/:id', controller.updateCertificado)

router.get('/actividades-servicio', controller.listActividades)
router.post('/actividades-servicio', controller.createActividad)
router.patch('/actividades-servicio/:id', controller.updateActividad)
router.delete('/actividades-servicio/:id', controller.deleteActividad)

router.get('/fotos-servicio', controller.listFotos)
router.post('/fotos-servicio', controller.createFoto)
router.delete('/fotos-servicio/:id', controller.deleteFoto)

router.get('/estaciones-usadas', controller.listEstaciones)
router.post('/estaciones-usadas', controller.createEstacion)
router.delete('/estaciones-usadas/:id', controller.deleteEstacion)
router.delete('/estaciones-usadas', controller.deleteEstacionesByOrden)

router.get('/productos-usados', controller.listProductos)
router.post('/productos-usados', controller.createProducto)
router.delete('/productos-usados/:id', controller.deleteProducto)

router.get('/solicitudes-servicio/count', controller.countSolicitudes)
router.get('/solicitudes-servicio', controller.listSolicitudes)
router.post('/solicitudes-servicio', controller.createSolicitud)
router.patch('/solicitudes-servicio/:id', controller.updateSolicitud)
router.delete('/solicitudes-servicio/:id', controller.deleteSolicitud)

export default router
