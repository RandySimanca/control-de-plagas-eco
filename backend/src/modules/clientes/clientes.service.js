import { pool } from '../../config/database.js'
import { AppError } from '../../utils/AppError.js'
import { storage } from '../../utils/storage.js'

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ORIGENES_PLANO = new Set(['plano', 'foto_croquis', 'croquis_app'])
const NOMBRE_PLANO_MAX = 255
const DIM_MAX = 20000
const PLANOS_BUCKET = 'planos'

function assertUuid (value, label) {
  if (!value || !UUID_RE.test(String(value))) {
    throw new AppError(`${label} inválido`, 400)
  }
}

function parseDim (value, label) {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > DIM_MAX) {
    throw new AppError(`${label} debe ser un entero entre 1 y ${DIM_MAX}`, 400)
  }
  return n
}

function parsePos (value, label) {
  if (value === null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new AppError(`${label} debe ser un número entre 0 y 1`, 400)
  }
  return n
}

function normalizeStoragePathPlanos (storagePath) {
  if (!storagePath || typeof storagePath !== 'string') return null
  const normalized = storagePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized.includes('..') || normalized.includes('\0')) return null
  const segments = normalized.split('/').filter(Boolean)
  if (segments[0] !== PLANOS_BUCKET || segments.length < 2) return null
  if (segments.some(seg => seg === '.' || seg === '..')) return null
  return segments.join('/')
}

function imagenUrlCorrespondeAStorage (imagenUrl, storagePath) {
  if (!imagenUrl || typeof imagenUrl !== 'string') return false
  const expectedPath = `/uploads/${storagePath}`
  const trimmed = imagenUrl.trim()
  if (trimmed === expectedPath) return true
  if (!/^https?:\/\//i.test(trimmed)) return false
  try {
    const parsed = new URL(trimmed)
    // Permitir URLs con cualquier hostname (túneles, dominios externos, etc.)
    // Solo validamos que el pathname termine con el storage_path esperado
    return parsed.pathname.endsWith(storagePath) || parsed.pathname === expectedPath
  } catch {
    return false
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

export async function updateEstacion(clienteId, id, body) {
  assertUuid(clienteId, 'Cliente')
  assertUuid(id, 'Estación')

  const { rows: existingRows } = await pool.query(
    'SELECT * FROM estaciones WHERE id = $1 AND cliente_id = $2',
    [id, clienteId]
  )
  if (!existingRows[0]) throw new AppError('Estación no encontrada', 404)
  const cur = existingRows[0]

  const allowed = ['numero', 'tipo', 'ubicacion', 'estado', 'fecha_instalacion', 'codigo_qr']
  const sets = []
  const vals = []
  for (const key of allowed) {
    if (body[key] !== undefined) {
      vals.push(body[key])
      sets.push(`${key} = $${vals.length}`)
    }
  }

  if (body.plano_id !== undefined || body.pos_x !== undefined || body.pos_y !== undefined) {
    let planoId = cur.plano_id
    let posX = cur.pos_x
    let posY = cur.pos_y

    if (body.plano_id !== undefined) {
      if (body.plano_id === null || body.plano_id === '') {
        planoId = null
        posX = null
        posY = null
      } else {
        assertUuid(body.plano_id, 'Plano')
        const { rows: planoRows } = await pool.query(
          'SELECT id, cliente_id, sede_id FROM sede_planos WHERE id = $1',
          [body.plano_id]
        )
        const plano = planoRows[0]
        if (!plano || plano.cliente_id !== clienteId) {
          throw new AppError('El plano no pertenece a este cliente', 400)
        }
        if (plano.sede_id && plano.sede_id !== cur.sede_id) {
          throw new AppError('El plano no pertenece a la sede de la estación', 400)
        }
        planoId = plano.id
      }
    }

    if (planoId !== null) {
      if (body.pos_x !== undefined) posX = parsePos(body.pos_x, 'pos_x')
      if (body.pos_y !== undefined) posY = parsePos(body.pos_y, 'pos_y')
    }

    if ((posX !== null && posX !== undefined) || (posY !== null && posY !== undefined)) {
      if (!planoId) {
        throw new AppError('No se puede asignar posición sin un plano', 400)
      }
    }

    vals.push(planoId)
    sets.push(`plano_id = $${vals.length}`)
    vals.push(posX ?? null)
    sets.push(`pos_x = $${vals.length}`)
    vals.push(posY ?? null)
    sets.push(`pos_y = $${vals.length}`)
  }

  if (!sets.length) throw new AppError('No hay campos para actualizar', 400)
  vals.push(id)
  vals.push(clienteId)
  const { rows } = await pool.query(
    `UPDATE estaciones SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${vals.length - 1} AND cliente_id = $${vals.length} RETURNING *`,
    vals
  )
  if (!rows[0]) throw new AppError('Estación no encontrada', 404)
  return rows[0]
}

export async function listPlanos (clienteId, sedeId = null) {
  assertUuid(clienteId, 'Cliente')
  let query = 'SELECT * FROM sede_planos WHERE cliente_id = $1'
  const params = [clienteId]
  if (sedeId) {
    assertUuid(sedeId, 'Sede')
    params.push(sedeId)
    query += ' AND sede_id = $2'
  }
  query += ' ORDER BY created_at DESC'
  const { rows } = await pool.query(query, params)
  return rows
}

export async function createPlano (clienteId, body) {
  assertUuid(clienteId, 'Cliente')
  await getClienteById(clienteId)

  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  if (!nombre) throw new AppError('El nombre del plano es obligatorio', 400)
  if (nombre.length > NOMBRE_PLANO_MAX) {
    throw new AppError(`El nombre no puede superar ${NOMBRE_PLANO_MAX} caracteres`, 400)
  }

  const origen = body.origen || 'plano'
  if (!ORIGENES_PLANO.has(origen)) {
    throw new AppError('Origen de plano no válido', 400)
  }

  const storagePath = normalizeStoragePathPlanos(body.storage_path)
  if (!storagePath) {
    throw new AppError('storage_path debe pertenecer al bucket planos', 400)
  }
  if (!imagenUrlCorrespondeAStorage(body.imagen_url, storagePath)) {
    throw new AppError('imagen_url debe apuntar al almacenamiento propio y coincidir con storage_path', 400)
  }

  let sedeId = body.sede_id || null
  if (sedeId) {
    assertUuid(sedeId, 'Sede')
    const { rows: sedeRows } = await pool.query(
      'SELECT id FROM clientes_sedes WHERE id = $1 AND cliente_id = $2',
      [sedeId, clienteId]
    )
    if (!sedeRows[0]) throw new AppError('La sede no pertenece a este cliente', 400)
  }

  const ancho = parseDim(body.ancho, 'ancho')
  const alto = parseDim(body.alto, 'alto')

  const { rows } = await pool.query(
    `INSERT INTO sede_planos (cliente_id, sede_id, nombre, origen, imagen_url, storage_path, ancho, alto)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [clienteId, sedeId, nombre, origen, body.imagen_url.trim(), storagePath, ancho, alto]
  )
  return rows[0]
}

export async function deletePlano (clienteId, planoId) {
  assertUuid(clienteId, 'Cliente')
  assertUuid(planoId, 'Plano')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      'SELECT * FROM sede_planos WHERE id = $1 AND cliente_id = $2 FOR UPDATE',
      [planoId, clienteId]
    )
    if (!rows[0]) throw new AppError('Plano no encontrado', 404)

    await client.query(
      'UPDATE estaciones SET plano_id = NULL, pos_x = NULL, pos_y = NULL, updated_at = NOW() WHERE plano_id = $1',
      [planoId]
    )
    await client.query('DELETE FROM sede_planos WHERE id = $1', [planoId])
    await client.query('COMMIT')

    if (rows[0].storage_path) {
      storage.delete(rows[0].storage_path).catch(err =>
        console.error('Error al eliminar archivo del plano del almacenamiento:', err)
      )
    }
    return rows[0]
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* ignore */ }
    throw err
  } finally {
    client.release()
  }
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