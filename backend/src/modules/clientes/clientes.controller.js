import { catchAsync } from '../../utils/catchAsync.js'
import * as clientesService from './clientes.service.js'
import { pool } from '../../config/database.js'
import { AppError } from '../../utils/AppError.js'

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
  // Admin puede siempre; cliente solo puede crear sedes en su propio cliente_id
  if (req.user.role !== 'admin') {
    const { rows } = await pool.query('SELECT cliente_id FROM profiles WHERE id = $1', [req.user.id])
    if (!rows[0] || rows[0].cliente_id !== req.params.id) {
      throw new AppError('No autorizado', 403)
    }
  }
  const data = await clientesService.createSede(req.params.id, req.body)
  res.status(201).json({ success: true, data })
})

export const updateSede = catchAsync(async (req, res) => {
  const data = await clientesService.updateSede(req.params.sede_id, req.body)
  res.json({ success: true, data })
})

export const deleteSede = catchAsync(async (req, res) => {
  // Admin puede siempre; cliente solo puede eliminar sedes de su propio cliente_id
  if (req.user.role !== 'admin') {
    const { rows } = await pool.query(
      'SELECT cs.id FROM clientes_sedes cs JOIN profiles p ON p.cliente_id = cs.cliente_id WHERE cs.id = $1 AND p.id = $2',
      [req.params.sede_id, req.user.id]
    )
    if (!rows[0]) throw new AppError('No autorizado', 403)
  }
  await clientesService.deleteSede(req.params.sede_id)
  res.status(204).send()
})
