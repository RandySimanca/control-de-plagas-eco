import { pool } from '../../config/database.js'
import { AppError } from '../../utils/AppError.js'
import * as tecnicosService from '../tecnicos/tecnicos.service.js'

const ESTADOS = ['pendiente', 'en_proceso', 'terminado']

function assertEstado (estado) {
  if (estado && !ESTADOS.includes(estado)) {
    throw new AppError(`Estado inválido. Use: ${ESTADOS.join(', ')}`, 400)
  }
}

export async function listServicios ({ user }) {
  let sql = `
    SELECT s.*,
           c.nombre AS cliente_nombre,
           t.nombre AS tecnico_nombre
    FROM servicios s
    JOIN clientes c ON c.id = s.cliente_id
    LEFT JOIN tecnicos t ON t.id = s.tecnico_id
  `
  const params = []
  if (user.role === 'tecnico') {
    const tecnicoRowId = await tecnicosService.getTecnicoRowIdForUser(user.id)
    if (!tecnicoRowId) {
      return []
    }
    params.push(tecnicoRowId)
    sql += ` WHERE s.tecnico_id = $1`
  }
  sql += ` ORDER BY s.fecha_programada NULLS LAST, s.created_at DESC`

  const { rows } = await pool.query(sql, params)
  return rows
}

export async function getServicioById (id, user) {
  let sql = `
    SELECT s.*,
           c.nombre AS cliente_nombre,
           c.email AS cliente_email,
           c.telefono AS cliente_telefono,
           c.direccion AS cliente_direccion,
           t.nombre AS tecnico_nombre,
           t.id AS tecnico_ref_id
    FROM servicios s
    JOIN clientes c ON c.id = s.cliente_id
    LEFT JOIN tecnicos t ON t.id = s.tecnico_id
    WHERE s.id = $1
  `
  const params = [id]

  if (user.role === 'tecnico') {
    const tecnicoRowId = await tecnicosService.getTecnicoRowIdForUser(user.id)
    if (!tecnicoRowId) {
      throw new AppError('Servicio no encontrado', 404)
    }
    sql += ` AND s.tecnico_id = $2`
    params.push(tecnicoRowId)
  }

  const { rows } = await pool.query(sql, params)
  if (!rows[0]) {
    throw new AppError('Servicio no encontrado', 404)
  }
  return rows[0]
}

export async function createServicio (body, user) {
  if (user.role !== 'admin') {
    throw new AppError('Solo administradores pueden crear servicios', 403)
  }
  if (!body.cliente_id) {
    throw new AppError('cliente_id es obligatorio', 400)
  }
  assertEstado(body.estado)

  const { rows: [row] } = await pool.query(
    `INSERT INTO servicios (cliente_id, tecnico_id, estado, fecha_programada, observaciones)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      body.cliente_id,
      body.tecnico_id || null,
      body.estado || 'pendiente',
      body.fecha_programada || null,
      body.observaciones?.trim() || null
    ]
  )
  return row
}

/**
 * Admin: actualiza todo. Técnico: solo estado (y solo de sus servicios asignados).
 */
export async function updateServicio (id, body, user) {
  const current = await getServicioById(id, user)

  if (user.role === 'admin') {
    const clienteId = body.cliente_id !== undefined ? body.cliente_id : current.cliente_id
    const tecnicoId = body.tecnico_id !== undefined ? body.tecnico_id : current.tecnico_id
    const estado = body.estado !== undefined ? body.estado : current.estado
    assertEstado(estado)
    const fechaProg = body.fecha_programada !== undefined ? body.fecha_programada : current.fecha_programada
    const observaciones = body.observaciones !== undefined ? (body.observaciones?.trim() || null) : current.observaciones

    const { rows: [row] } = await pool.query(
      `UPDATE servicios SET
         cliente_id = $2,
         tecnico_id = $3,
         estado = $4,
         fecha_programada = $5,
         observaciones = $6,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, clienteId, tecnicoId, estado, fechaProg, observaciones]
    )
    return row
  }

  // técnico
  if (body.estado === undefined) {
    throw new AppError('Los técnicos solo pueden actualizar el estado', 400)
  }
  assertEstado(body.estado)

  const { rows: [row] } = await pool.query(
    `UPDATE servicios SET estado = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, body.estado]
  )
  return row
}

/** Asignar técnico a un servicio (admin) */
export async function assignTecnico (servicioId, tecnicoId, user) {
  if (user.role !== 'admin') {
    throw new AppError('Solo administradores pueden asignar técnicos', 403)
  }
  if (tecnicoId) {
    const { rows } = await pool.query(`SELECT id FROM tecnicos WHERE id = $1 AND activo = TRUE`, [tecnicoId])
    if (!rows[0]) {
      throw new AppError('Técnico no encontrado o inactivo', 400)
    }
  }

  const { rows: [row] } = await pool.query(
    `UPDATE servicios SET tecnico_id = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [servicioId, tecnicoId || null]
  )
  if (!row) {
    throw new AppError('Servicio no encontrado', 404)
  }
  return row
}

export async function deleteServicio (id, user) {
  if (user.role !== 'admin') {
    throw new AppError('Solo administradores pueden eliminar servicios', 403)
  }
  const { rowCount } = await pool.query(`DELETE FROM servicios WHERE id = $1`, [id])
  if (!rowCount) {
    throw new AppError('Servicio no encontrado', 404)
  }
}
