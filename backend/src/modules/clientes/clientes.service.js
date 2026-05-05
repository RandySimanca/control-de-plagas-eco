import { pool } from '../../config/database.js'
import { AppError } from '../../utils/AppError.js'

export async function listClientes () {
  const { rows } = await pool.query(
    `SELECT * FROM clientes ORDER BY nombre`
  )
  return rows
}

export async function getClienteById (id) {
  const { rows } = await pool.query(`SELECT * FROM clientes WHERE id = $1`, [id])
  if (!rows[0]) {
    throw new AppError('Cliente no encontrado', 404)
  }
  return rows[0]
}

export async function createCliente (body) {
  if (!body.nombre?.trim()) {
    throw new AppError('El nombre es obligatorio', 400)
  }
  const { rows: [row] } = await pool.query(
    `INSERT INTO clientes (nombre, email, telefono, direccion, notas, activo)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      body.nombre.trim(),
      body.email?.trim() || null,
      body.telefono?.trim() || null,
      body.direccion?.trim() || null,
      body.notas?.trim() || null,
      body.activo !== false
    ]
  )
  return row
}

export async function updateCliente (id, body) {
  const cur = await getClienteById(id)
  const nombre = body.nombre !== undefined ? String(body.nombre).trim() : cur.nombre
  const email = body.email !== undefined ? (body.email ? String(body.email).trim() : null) : cur.email
  const telefono = body.telefono !== undefined ? (body.telefono ? String(body.telefono).trim() : null) : cur.telefono
  const direccion = body.direccion !== undefined ? (body.direccion ? String(body.direccion).trim() : null) : cur.direccion
  const notas = body.notas !== undefined ? (body.notas ? String(body.notas).trim() : null) : cur.notas
  const activo = body.activo !== undefined ? Boolean(body.activo) : cur.activo

  if (!nombre) {
    throw new AppError('El nombre no puede quedar vacío', 400)
  }

  const { rows: [row] } = await pool.query(
    `UPDATE clientes SET
       nombre = $2, email = $3, telefono = $4, direccion = $5, notas = $6, activo = $7, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, nombre, email, telefono, direccion, notas, activo]
  )
  return row
}

export async function deleteCliente (id) {
  const { rowCount } = await pool.query(`DELETE FROM clientes WHERE id = $1`, [id])
  if (!rowCount) {
    throw new AppError('Cliente no encontrado', 404)
  }
}
