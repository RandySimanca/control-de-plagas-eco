import { pool } from '../../config/database.js'
import { AppError } from '../../utils/AppError.js'

export async function listTecnicos () {
  const { rows } = await pool.query(
    `SELECT t.*, u.email AS user_email, u.role AS user_role
     FROM tecnicos t
     LEFT JOIN users u ON u.id = t.user_id
     ORDER BY t.nombre`
  )
  return rows
}

export async function getTecnicoById (id) {
  const { rows } = await pool.query(
    `SELECT t.*, u.email AS user_email
     FROM tecnicos t
     LEFT JOIN users u ON u.id = t.user_id
     WHERE t.id = $1`,
    [id]
  )
  if (!rows[0]) {
    throw new AppError('Técnico no encontrado', 404)
  }
  return rows[0]
}

/**
 * user_id opcional: vincular cuenta de usuario (debe ser rol técnico)
 */
export async function createTecnico (body) {
  if (!body.nombre?.trim()) {
    throw new AppError('El nombre es obligatorio', 400)
  }
  if (body.user_id) {
    const { rows: u } = await pool.query(
      `SELECT id, role FROM users WHERE id = $1`,
      [body.user_id]
    )
    if (!u[0]) {
      throw new AppError('Usuario no encontrado', 400)
    }
    if (u[0].role !== 'tecnico') {
      throw new AppError('Solo se puede vincular un usuario con rol técnico', 400)
    }
    const { rows: taken } = await pool.query(
      `SELECT id FROM tecnicos WHERE user_id = $1`,
      [body.user_id]
    )
    if (taken[0]) {
      throw new AppError('Ese usuario ya está vinculado a otro técnico', 409)
    }
  }

  const { rows: [row] } = await pool.query(
    `INSERT INTO tecnicos (user_id, nombre, telefono, email, activo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      body.user_id || null,
      body.nombre.trim(),
      body.telefono?.trim() || null,
      body.email?.trim() || null,
      body.activo !== false
    ]
  )
  return row
}

export async function updateTecnico (id, body) {
  const cur = await getTecnicoById(id)
  if (body.user_id !== undefined) {
    if (body.user_id) {
      const { rows: u } = await pool.query(
        `SELECT id, role FROM users WHERE id = $1`,
        [body.user_id]
      )
      if (!u[0] || u[0].role !== 'tecnico') {
        throw new AppError('Usuario inválido o no es técnico', 400)
      }
      const { rows: taken } = await pool.query(
        `SELECT id FROM tecnicos WHERE user_id = $1 AND id <> $2`,
        [body.user_id, id]
      )
      if (taken[0]) {
        throw new AppError('Ese usuario ya está vinculado a otro técnico', 409)
      }
    }
  }

  const nombre = body.nombre !== undefined ? String(body.nombre).trim() : cur.nombre
  const telefono = body.telefono !== undefined ? (body.telefono ? String(body.telefono).trim() : null) : cur.telefono
  const email = body.email !== undefined ? (body.email ? String(body.email).trim() : null) : cur.email
  const activo = body.activo !== undefined ? Boolean(body.activo) : cur.activo
  const userId = body.user_id !== undefined ? body.user_id : cur.user_id

  if (!nombre) {
    throw new AppError('El nombre no puede quedar vacío', 400)
  }

  const { rows: [row] } = await pool.query(
    `UPDATE tecnicos SET
       user_id = $2,
       nombre = $3,
       telefono = $4,
       email = $5,
       activo = $6,
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, userId, nombre, telefono, email, activo]
  )
  return row
}

export async function deleteTecnico (id) {
  const { rowCount } = await pool.query(`DELETE FROM tecnicos WHERE id = $1`, [id])
  if (!rowCount) {
    throw new AppError('Técnico no encontrado', 404)
  }
}

/** Devuelve el id de fila tecnicos para el usuario logueado, o null */
export async function getTecnicoRowIdForUser (userId) {
  const { rows } = await pool.query(
    `SELECT id FROM tecnicos WHERE user_id = $1 AND activo = TRUE`,
    [userId]
  )
  return rows[0]?.id ?? null
}
