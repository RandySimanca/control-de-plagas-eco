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
    `INSERT INTO clientes (nombre, email, telefono, direccion, municipio, notas, activo, razon_social, identificacion, nombre_contacto, telefono_contacto, tipo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      body.nombre.trim(),
      body.email?.trim() || null,
      body.telefono?.trim() || null,
      body.direccion?.trim() || null,
      body.municipio?.trim() || null,
      body.notas?.trim() || null,
      body.activo !== false,
      body.razon_social?.trim() || null,
      body.identificacion?.trim() || null,
      body.nombre_contacto?.trim() || null,
      body.telefono_contacto?.trim() || null,
      body.tipo || 'residencial'
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
  const municipio = body.municipio !== undefined ? (body.municipio ? String(body.municipio).trim() : null) : cur.municipio
  const notas = body.notas !== undefined ? (body.notas ? String(body.notas).trim() : null) : cur.notas
  const activo = body.activo !== undefined ? Boolean(body.activo) : cur.activo
  const razon_social = body.razon_social !== undefined ? (body.razon_social ? String(body.razon_social).trim() : null) : cur.razon_social
  const identificacion = body.identificacion !== undefined ? (body.identificacion ? String(body.identificacion).trim() : null) : cur.identificacion
  const nombre_contacto = body.nombre_contacto !== undefined ? (body.nombre_contacto ? String(body.nombre_contacto).trim() : null) : cur.nombre_contacto
  const telefono_contacto = body.telefono_contacto !== undefined ? (body.telefono_contacto ? String(body.telefono_contacto).trim() : null) : cur.telefono_contacto
  const tipo = body.tipo !== undefined ? (body.tipo || 'residencial') : cur.tipo

  if (!nombre) {
    throw new AppError('El nombre no puede quedar vacío', 400)
  }

  const { rows: [row] } = await pool.query(
    `UPDATE clientes SET
       nombre = $2, email = $3, telefono = $4, direccion = $5, municipio = $6, notas = $7, activo = $8,
       razon_social = $9, identificacion = $10, nombre_contacto = $11, telefono_contacto = $12, tipo = $13,
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, nombre, email, telefono, direccion, municipio, notas, activo, razon_social, identificacion, nombre_contacto, telefono_contacto, tipo]
  )
  return row
}

export async function deleteCliente (id) {
  const { rowCount } = await pool.query(`DELETE FROM clientes WHERE id = $1`, [id])
  if (!rowCount) {
    throw new AppError('Cliente no encontrado', 404)
  }
}


export async function listEstaciones(clienteId, sedeId = null) {
  let query = 'SELECT * FROM estaciones WHERE cliente_id = $1'
  const params = [clienteId]
  if (sedeId) {
    params.push(sedeId)
    query += ` AND sede_id = $2`
  }
  query += ' ORDER BY tipo, numero'
  const { rows } = await pool.query(query, params)
  return rows
}

export async function createEstacion(clienteId, body) {
  const { rows } = await pool.query(
    `INSERT INTO estaciones (id, cliente_id, sede_id, numero, tipo, ubicacion, estado, fecha_instalacion, codigo_qr) 
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()), $9) RETURNING *`,
    [body.id || null, clienteId, body.sede_id || null, body.numero, body.tipo, body.ubicacion || null, body.estado || 'activa', body.fecha_instalacion || null, body.codigo_qr || null]
  )
  return rows[0]
}

// --- SEDES ---

export async function listSedes(clienteId) {
  const { rows } = await pool.query('SELECT * FROM clientes_sedes WHERE cliente_id = $1 ORDER BY nombre', [clienteId])
  return rows
}

export async function createSede(clienteId, body) {
  if (!body.nombre?.trim()) throw new AppError('El nombre de la sede es obligatorio', 400)
  const { rows } = await pool.query(
    'INSERT INTO clientes_sedes (cliente_id, nombre, direccion, municipio) VALUES ($1, $2, $3, $4) RETURNING *',
    [clienteId, body.nombre.trim(), body.direccion?.trim() || null, body.municipio?.trim() || null]
  )
  return rows[0]
}

export async function updateSede(sedeId, body) {
  if (!body.nombre?.trim()) throw new AppError('El nombre de la sede es obligatorio', 400)
  const { rows } = await pool.query(
    'UPDATE clientes_sedes SET nombre = $1, direccion = $2, municipio = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
    [body.nombre.trim(), body.direccion?.trim() || null, body.municipio?.trim() || null, sedeId]
  )
  if (!rows[0]) throw new AppError('Sede no encontrada', 404)
  return rows[0]
}

export async function deleteSede(sedeId) {
  const { rowCount } = await pool.query('DELETE FROM clientes_sedes WHERE id = $1', [sedeId])
  if (!rowCount) throw new AppError('Sede no encontrada', 404)
}

export async function updateEstacion(id, body) {
  const allowed = ['numero', 'tipo', 'ubicacion', 'estado', 'fecha_instalacion', 'codigo_qr']
  const sets = []
  const vals = []
  for (const key of allowed) {
    if (body[key] !== undefined) {
      vals.push(body[key])
      sets.push(`${key} = $${vals.length}`)
    }
  }
  if (!sets.length) throw new AppError('No hay campos para actualizar', 400)
  vals.push(id)
  const { rows } = await pool.query(`UPDATE estaciones SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`, vals)
  if (!rows[0]) throw new AppError('Estación no encontrada', 404)
  return rows[0]
}

export async function deleteEstacion(id) {
  const { rowCount } = await pool.query('DELETE FROM estaciones WHERE id = $1', [id])
  if (!rowCount) throw new AppError('Estación no encontrada', 404)
}

/**
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
    `INSERT INTO clientes (nombre, email, telefono, direccion, notas, activo, razon_social, identificacion, nombre_contacto, telefono_contacto, tipo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      body.nombre.trim(),
      body.email?.trim() || null,
      body.telefono?.trim() || null,
      body.direccion?.trim() || null,
      body.notas?.trim() || null,
      body.activo !== false,
      body.razon_social?.trim() || null,
      body.identificacion?.trim() || null,
      body.nombre_contacto?.trim() || null,
      body.telefono_contacto?.trim() || null,
      body.tipo || 'residencial'
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
  const razon_social = body.razon_social !== undefined ? (body.razon_social ? String(body.razon_social).trim() : null) : cur.razon_social
  const identificacion = body.identificacion !== undefined ? (body.identificacion ? String(body.identificacion).trim() : null) : cur.identificacion
  const nombre_contacto = body.nombre_contacto !== undefined ? (body.nombre_contacto ? String(body.nombre_contacto).trim() : null) : cur.nombre_contacto
  const telefono_contacto = body.telefono_contacto !== undefined ? (body.telefono_contacto ? String(body.telefono_contacto).trim() : null) : cur.telefono_contacto
  const tipo = body.tipo !== undefined ? (body.tipo || 'residencial') : cur.tipo

  if (!nombre) {
    throw new AppError('El nombre no puede quedar vacío', 400)
  }

  const { rows: [row] } = await pool.query(
    `UPDATE clientes SET
       nombre = $2, email = $3, telefono = $4, direccion = $5, notas = $6, activo = $7, 
       razon_social = $8, identificacion = $9, nombre_contacto = $10, telefono_contacto = $11, tipo = $12,
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, nombre, email, telefono, direccion, notas, activo, razon_social, identificacion, nombre_contacto, telefono_contacto, tipo]
  )
  return row
}

export async function deleteCliente (id) {
  const { rowCount } = await pool.query(`DELETE FROM clientes WHERE id = $1`, [id])
  if (!rowCount) {
    throw new AppError('Cliente no encontrado', 404)
  }
}
**/