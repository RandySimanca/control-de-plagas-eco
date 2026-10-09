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
  if (req.user.role === 'tecnico') {
    const { rows } = await pool.query(
      'SELECT o.id FROM ordenes_servicio o WHERE o.cliente_id = $1 AND o.tecnico_id = $2 LIMIT 1',
      [req.params.id, req.user.id]
    )
    if (!rows[0]) throw new AppError('No autorizado: no tienes órdenes asignadas para este cliente', 403)
    if (req.body.plano_id === null || req.body.plano_id === '') {
      throw new AppError('Solo un administrador puede quitar una estación de su plano', 403)
    }
  }
  const data = await clientesService.updateEstacion(req.params.id, req.params.estacion_id, req.body)
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

export const listPlanos = catchAsync(async (req, res) => {
  // Admin puede siempre; técnico y cliente solo pueden ver planos de sus clientes
  if (req.user.role !== 'admin') {
    if (req.user.role === 'tecnico') {
      // Técnico puede ver planos de cualquier cliente (sin restricción por ahora)
      // Esto permite que el técnico vea planos subidos por el admin
      // Si se requiere restricción, uncomment la validación de órdenes
      /*
      const { rows } = await pool.query(
        'SELECT o.id FROM ordenes_servicio o WHERE o.cliente_id = $1 AND o.tecnico_id = $2 LIMIT 1',
        [req.params.id, req.user.id]
      )
      if (!rows[0]) throw new AppError('No autorizado: no tienes órdenes asignadas para este cliente', 403)
      */
    } else if (req.user.role === 'cliente') {
      // Cliente solo puede ver planos de su propio cliente_id
      const { rows } = await pool.query('SELECT cliente_id FROM profiles WHERE id = $1', [req.user.id])
      if (!rows[0] || rows[0].cliente_id !== req.params.id) {
        throw new AppError('No autorizado', 403)
      }
    } else {
      throw new AppError('No autorizado', 403)
    }
  }
  const data = await clientesService.listPlanos(req.params.id, req.query.sede_id)
  res.json({ success: true, data })
})

export const createPlano = catchAsync(async (req, res) => {
  // Admin puede siempre; técnico solo puede crear planos para clientes de sus órdenes asignadas
  if (req.user.role !== 'admin') {
    if (req.user.role === 'tecnico') {
      // Verificar que el técnico tiene órdenes asignadas para este cliente
      const { rows } = await pool.query(
        'SELECT o.id FROM ordenes_servicio o WHERE o.cliente_id = $1 AND o.tecnico_id = $2 LIMIT 1',
        [req.params.id, req.user.id]
      )
      if (!rows[0]) throw new AppError('No autorizado: no tienes órdenes asignadas para este cliente', 403)
    } else if (req.user.role === 'cliente') {
      // Cliente solo puede crear planos en su propio cliente_id
      const { rows } = await pool.query('SELECT cliente_id FROM profiles WHERE id = $1', [req.user.id])
      if (!rows[0] || rows[0].cliente_id !== req.params.id) {
        throw new AppError('No autorizado', 403)
      }
    } else {
      throw new AppError('No autorizado', 403)
    }
  }
  const data = await clientesService.createPlano(req.params.id, req.body)
  res.status(201).json({ success: true, data })
})

export const deletePlano = catchAsync(async (req, res) => {
  // Admin puede siempre; técnico solo puede eliminar planos de clientes de sus órdenes asignadas
  if (req.user.role !== 'admin') {
    if (req.user.role === 'tecnico') {
      // Verificar que el técnico tiene órdenes asignadas para este cliente
      const { rows } = await pool.query(
        'SELECT o.id FROM ordenes_servicio o WHERE o.cliente_id = $1 AND o.tecnico_id = $2 LIMIT 1',
        [req.params.id, req.user.id]
      )
      if (!rows[0]) throw new AppError('No autorizado: no tienes órdenes asignadas para este cliente', 403)
    } else if (req.user.role === 'cliente') {
      // Cliente solo puede eliminar planos de su propio cliente_id
      const { rows } = await pool.query('SELECT cliente_id FROM profiles WHERE id = $1', [req.user.id])
      if (!rows[0] || rows[0].cliente_id !== req.params.id) {
        throw new AppError('No autorizado', 403)
      }
    } else {
      throw new AppError('No autorizado', 403)
    }
  }
  await clientesService.deletePlano(req.params.id, req.params.plano_id)
  res.status(204).send()
})
