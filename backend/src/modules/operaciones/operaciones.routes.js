import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'
import * as controller from './operaciones.controller.js'

const router = Router()

router.use(authenticate)

router.get('/ordenes-servicio', controller.listOrdenes)
router.patch('/ordenes-servicio/:id', controller.updateOrden)
router.post('/ordenes-servicio', controller.createOrden)
router.delete('/ordenes-servicio/:id', controller.deleteOrden)

router.get('/ordenes/:id', controller.getOrdenDetalle)
router.get('/ordenes/:id/productos', controller.getProductosByOrden)
router.get('/ordenes/:id/fotos', controller.getFotosByOrden)
router.get('/ordenes/:id/actividades', controller.getActividadesByOrden)
router.get('/ordenes/:id/estaciones', controller.getEstacionesByOrden)
router.get('/ordenes/:id/certificado', controller.getLatestCertificadoByOrden)

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
