import { pool } from '../../config/database.js'
import { AppError } from '../../utils/AppError.js'

export async function listUsers () {
  const { rows } = await pool.query(
    `SELECT id, email, role, nombre, created_at FROM users ORDER BY nombre`
  )
  return rows
}

export async function getUserById (id) {
  const { rows } = await pool.query(
    `SELECT id, email, role, nombre, created_at FROM users WHERE id = $1`,
    [id]
  )
  if (!rows[0]) {
    throw new AppError('Usuario no encontrado', 404)
  }
  return rows[0]
}
