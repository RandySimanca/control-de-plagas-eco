import { catchAsync } from '../../utils/catchAsync.js'
import * as serviciosService from './servicios.service.js'

export const list = catchAsync(async (req, res) => {
  const data = await serviciosService.listServicios({ user: req.user })
  res.json({ success: true, data })
})

export const getById = catchAsync(async (req, res) => {
  const data = await serviciosService.getServicioById(req.params.id, req.user)
  res.json({ success: true, data })
})

export const create = catchAsync(async (req, res) => {
  const data = await serviciosService.createServicio(req.body, req.user)
  res.status(201).json({ success: true, data })
})

export const update = catchAsync(async (req, res) => {
  const data = await serviciosService.updateServicio(req.params.id, req.body, req.user)
  res.json({ success: true, data })
})

export const assign = catchAsync(async (req, res) => {
  const { tecnico_id: tecnicoId } = req.body
  const data = await serviciosService.assignTecnico(req.params.id, tecnicoId, req.user)
  res.json({ success: true, data })
})

export const remove = catchAsync(async (req, res) => {
  await serviciosService.deleteServicio(req.params.id, req.user)
  res.status(204).send()
})
