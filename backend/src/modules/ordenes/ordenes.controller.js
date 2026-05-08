import { catchAsync } from '../../utils/catchAsync.js'
import * as ordenesService from './ordenes.service.js'

export const list = catchAsync(async (req, res) => {
  const filters = {};
  if (req.query.cliente_id) filters.cliente_id = req.query.cliente_id;
  if (req.query.estado) filters.estado = req.query.estado;
  if (req.query.tecnico_id) filters.tecnico_id = req.query.tecnico_id;
  const data = await ordenesService.listOrdenes({ user: req.user, filters });
  res.json({ success: true, data });
});

export const getById = catchAsync(async (req, res) => {
  const data = await ordenesService.getOrdenById(req.params.id, req.user)
  res.json({ success: true, data })
})

export const create = catchAsync(async (req, res) => {
  const data = await ordenesService.createOrden(req.body, req.user)
  res.status(201).json({ success: true, data })
})

export const update = catchAsync(async (req, res) => {
  const data = await ordenesService.updateOrden(req.params.id, req.body, req.user)
  res.json({ success: true, data })
})

export const assign = catchAsync(async (req, res) => {
  const { tecnico_id: tecnicoId } = req.body
  const data = await ordenesService.assignTecnico(req.params.id, tecnicoId, req.user)
  res.json({ success: true, data })
})

export const remove = catchAsync(async (req, res) => {
  await ordenesService.deleteOrden(req.params.id, req.user)
  res.status(204).send()
})
