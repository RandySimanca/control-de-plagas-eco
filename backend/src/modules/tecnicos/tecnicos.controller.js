import { catchAsync } from '../../utils/catchAsync.js'
import * as tecnicosService from './tecnicos.service.js'

export const list = catchAsync(async (req, res) => {
  const data = await tecnicosService.listTecnicos()
  res.json({ success: true, data })
})

export const getById = catchAsync(async (req, res) => {
  const data = await tecnicosService.getTecnicoById(req.params.id)
  res.json({ success: true, data })
})

export const create = catchAsync(async (req, res) => {
  const data = await tecnicosService.createTecnico(req.body)
  res.status(201).json({ success: true, data })
})

export const update = catchAsync(async (req, res) => {
  const data = await tecnicosService.updateTecnico(req.params.id, req.body)
  res.json({ success: true, data })
})

export const remove = catchAsync(async (req, res) => {
  await tecnicosService.deleteTecnico(req.params.id)
  res.status(204).send()
})
