import { catchAsync } from '../../utils/catchAsync.js'
import * as clientesService from './clientes.service.js'

export const list = catchAsync(async (req, res) => {
  const data = await clientesService.listClientes()
  res.json({ success: true, data })
})

export const getById = catchAsync(async (req, res) => {
  const data = await clientesService.getClienteById(req.params.id)
  res.json({ success: true, data })
})

export const create = catchAsync(async (req, res) => {
  const data = await clientesService.createCliente(req.body)
  res.status(201).json({ success: true, data })
})

export const update = catchAsync(async (req, res) => {
  const data = await clientesService.updateCliente(req.params.id, req.body)
  res.json({ success: true, data })
})

export const remove = catchAsync(async (req, res) => {
  await clientesService.deleteCliente(req.params.id)
  res.status(204).send()
})

export const listEstaciones = catchAsync(async (req, res) => {
  const data = await clientesService.listEstaciones(req.params.id, req.query.sede_id)
  res.json({ success: true, data })
})

export const createEstacion = catchAsync(async (req, res) => {
  const data = await clientesService.createEstacion(req.params.id, req.body)
  res.status(201).json({ success: true, data })
})

export const updateEstacion = catchAsync(async (req, res) => {
  const data = await clientesService.updateEstacion(req.params.estacion_id, req.body)
  res.json({ success: true, data })
})

export const deleteEstacion = catchAsync(async (req, res) => {
  await clientesService.deleteEstacion(req.params.estacion_id)
  res.status(204).send()
})

// Sedes
export const listSedes = catchAsync(async (req, res) => {
  const data = await clientesService.listSedes(req.params.id)
  res.json({ success: true, data })
})

export const createSede = catchAsync(async (req, res) => {
  const data = await clientesService.createSede(req.params.id, req.body)
  res.status(201).json({ success: true, data })
})

export const updateSede = catchAsync(async (req, res) => {
  const data = await clientesService.updateSede(req.params.sede_id, req.body)
  res.json({ success: true, data })
})

export const deleteSede = catchAsync(async (req, res) => {
  await clientesService.deleteSede(req.params.sede_id)
  res.status(204).send()
})
