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
