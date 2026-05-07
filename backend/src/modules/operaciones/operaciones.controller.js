import { catchAsync } from '../../utils/catchAsync.js'
import * as service from './operaciones.service.js'

export const listOrdenes = catchAsync(async (req, res) => res.json({ success: true, data: await service.listOrdenes(req.user) }))
export const updateOrden = catchAsync(async (req, res) => res.json({ success: true, data: await service.updateOrden(req.params.id, req.body, req.user) }))
export const createOrden = catchAsync(async (req, res) => res.status(201).json({ success: true, data: await service.createOrden(req.body, req.user) }))
export const deleteOrden = catchAsync(async (req, res) => { await service.deleteOrden(req.params.id, req.user); res.status(204).send() })

export const getOrdenDetalle = catchAsync(async (req, res) => res.json({ success: true, data: await service.getOrdenDetalle(req.params.id, req.user) }))
export const getProductosByOrden = catchAsync(async (req, res) => res.json({ success: true, data: await service.getProductosByOrden(req.params.id) }))
export const getFotosByOrden = catchAsync(async (req, res) => res.json({ success: true, data: await service.getFotosByOrden(req.params.id) }))
export const getActividadesByOrden = catchAsync(async (req, res) => res.json({ success: true, data: await service.getActividadesByOrden(req.params.id) }))
export const getEstacionesByOrden = catchAsync(async (req, res) => res.json({ success: true, data: await service.getEstacionesByOrden(req.params.id) }))
export const getLatestCertificadoByOrden = catchAsync(async (req, res) => res.json({ success: true, data: await service.getLatestCertificadoByOrden(req.params.id) }))

export const listCertificados = catchAsync(async (req, res) => res.json({ success: true, data: await service.listCertificados(req.user) }))
export const createCertificado = catchAsync(async (req, res) => res.status(201).json({ success: true, data: await service.createCertificado(req.body) }))
export const updateCertificado = catchAsync(async (req, res) => res.json({ success: true, data: await service.updateCertificado(req.params.id, req.body) }))

export const listActividades = catchAsync(async (req, res) => res.json({ success: true, data: await service.listActividades(req.query.orden_id) }))
export const createActividad = catchAsync(async (req, res) => res.status(201).json({ success: true, data: await service.createActividad(req.body) }))
export const updateActividad = catchAsync(async (req, res) => res.json({ success: true, data: await service.updateActividad(req.params.id, req.body) }))
export const deleteActividad = catchAsync(async (req, res) => { await service.deleteActividad(req.params.id); res.status(204).send() })

export const listFotos = catchAsync(async (req, res) => res.json({ success: true, data: await service.listFotos(req.query.orden_id) }))
export const createFoto = catchAsync(async (req, res) => res.status(201).json({ success: true, data: await service.createFoto(req.body) }))
export const deleteFoto = catchAsync(async (req, res) => { await service.deleteFoto(req.params.id); res.status(204).send() })

export const listEstaciones = catchAsync(async (req, res) => res.json({ success: true, data: await service.listEstaciones(req.query.orden_id) }))
export const createEstacion = catchAsync(async (req, res) => res.status(201).json({ success: true, data: await service.createEstacion(req.body) }))
export const deleteEstacion = catchAsync(async (req, res) => { await service.deleteEstacion(req.params.id); res.status(204).send() })
export const deleteEstacionesByOrden = catchAsync(async (req, res) => { await service.deleteEstacionesByOrden(req.query.orden_id || req.body?.orden_id); res.status(204).send() })

export const listProductos = catchAsync(async (req, res) => res.json({ success: true, data: await service.listProductos(req.query.orden_id) }))
export const createProducto = catchAsync(async (req, res) => res.status(201).json({ success: true, data: await service.createProducto(req.body) }))
export const deleteProducto = catchAsync(async (req, res) => { await service.deleteProducto(req.params.id); res.status(204).send() })

export const listSolicitudes = catchAsync(async (req, res) => res.json({ success: true, data: await service.listSolicitudes(req.user) }))
export const createSolicitud = catchAsync(async (req, res) => res.status(201).json({ success: true, data: await service.createSolicitud(req.body, req.user) }))
export const updateSolicitud = catchAsync(async (req, res) => res.json({ success: true, data: await service.updateSolicitud(req.params.id, req.body, req.user) }))
export const deleteSolicitud = catchAsync(async (req, res) => { await service.deleteSolicitud(req.params.id, req.user); res.status(204).send() })
export const countSolicitudes = catchAsync(async (req, res) => res.json({ success: true, count: await service.countSolicitudes(req.query) }))
