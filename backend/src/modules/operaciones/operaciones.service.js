import { pool } from '../../config/database.js'
import { AppError } from '../../utils/AppError.js'

async function getProfile(userId) {
  const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [userId])
  return rows[0] || null
}

async function assertOrdenAccess(ordenId, user) {
  const orden = await getOrdenDetalle(ordenId, user)
  if (!orden) throw new AppError('Orden no encontrada', 404)
  return orden
}

export async function listOrdenes(user) {
  const profile = await getProfile(user.id)
  const params = []
  const where = []

  if (user.role === 'tecnico') {
    params.push(user.id)
    where.push(`o.tecnico_id = $${params.length}`)
  }
  if (user.role === 'cliente') {
    params.push(profile?.cliente_id || null)
    where.push(`o.cliente_id = $${params.length}`)
  }

  const sql = `
    SELECT o.*, c.nombre AS cliente_nombre, p.nombre_completo AS tecnico_nombre
    FROM ordenes_servicio o
    LEFT JOIN clientes c ON c.id = o.cliente_id
    LEFT JOIN profiles p ON p.id = o.tecnico_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY o.fecha_programada DESC NULLS LAST, o.created_at DESC
  `
  const { rows } = await pool.query(sql, params)
  return rows
}

export async function getOrdenDetalle(id, user) {
  await ensureOperacionesSchema()
  const params = [id]
  let extra = ''
  if (user.role === 'tecnico') {
    params.push(user.id)
    extra = ` AND o.tecnico_id = $${params.length}`
  } else if (user.role === 'cliente') {
    const profile = await getProfile(user.id)
    params.push(profile?.cliente_id || null)
    extra = ` AND o.cliente_id = $${params.length}`
  }

  const { rows } = await pool.query(
    `
      SELECT o.*, row_to_json(c) AS clientes, row_to_json(p) AS profiles
      FROM ordenes_servicio o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN profiles p ON p.id = o.tecnico_id
      WHERE o.id = $1 ${extra}
      LIMIT 1
    `,
    params
  )
  if (!rows[0]) throw new AppError('Orden no encontrada', 404)
  return rows[0]
}

export async function createOrden(body, user) {
  if (user.role !== 'admin') throw new AppError('Solo administradores', 403)
  const { rows } = await pool.query(
    `INSERT INTO ordenes_servicio (cliente_id, tecnico_id, fecha_programada, tipo_plaga, observaciones, estado)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [body.cliente_id, body.tecnico_id || null, body.fecha_programada || null, body.tipo_plaga || null, body.observaciones || null, body.estado || 'programada']
  )
  return rows[0]
}

export async function updateOrden(id, body, user) {
  await assertOrdenAccess(id, user)
  const allowed = ['cliente_id', 'tecnico_id', 'fecha_programada', 'tipo_plaga', 'observaciones', 'estado', 'recomendaciones', 'areas_intervenidas', 'metodos_aplicacion']
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
  const { rows } = await pool.query(`UPDATE ordenes_servicio SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`, vals)
  return rows[0]
}

export async function deleteOrden(id, user) {
  if (user.role !== 'admin') throw new AppError('Solo administradores', 403)
  await pool.query('DELETE FROM ordenes_servicio WHERE id = $1', [id])
}

export async function getProductosByOrden(ordenId) {
  const { rows } = await pool.query('SELECT * FROM productos_usados WHERE orden_id = $1 ORDER BY created_at DESC', [ordenId])
  return rows
}
export async function getFotosByOrden(ordenId) {
  const { rows } = await pool.query('SELECT * FROM fotos_servicio WHERE orden_id = $1 ORDER BY created_at DESC', [ordenId])
  return rows
}
export async function getActividadesByOrden(ordenId) {
  const { rows } = await pool.query('SELECT * FROM actividades_servicio WHERE orden_id = $1 ORDER BY created_at DESC', [ordenId])
  return rows
}
export async function getEstacionesByOrden(ordenId) {
  const { rows } = await pool.query('SELECT * FROM estaciones_usadas WHERE orden_id = $1 ORDER BY created_at DESC', [ordenId])
  return rows
}
export async function getLatestCertificadoByOrden(ordenId) {
  const { rows } = await pool.query('SELECT * FROM certificados WHERE orden_id = $1 ORDER BY created_at DESC LIMIT 1', [ordenId])
  return rows[0] || null
}

export async function listCertificados(user) {
  const params = []
  let where = ''
  if (user.role === 'tecnico') {
    params.push(user.id)
    where = `WHERE o.tecnico_id = $1`
  } else if (user.role === 'cliente') {
    const profile = await getProfile(user.id)
    params.push(profile?.cliente_id || null)
    where = `WHERE o.cliente_id = $1`
  }
  const { rows } = await pool.query(
    `
      SELECT c.*, row_to_json(o) AS ordenes_servicio
      FROM certificados c
      JOIN (
        SELECT o.*, row_to_json(cl) AS clientes, row_to_json(p) AS profiles
        FROM ordenes_servicio o
        LEFT JOIN clientes cl ON cl.id = o.cliente_id
        LEFT JOIN profiles p ON p.id = o.tecnico_id
      ) o ON o.id = c.orden_id
      ${where}
      ORDER BY c.created_at DESC
    `,
    params
  )
  return rows
}
export async function createCertificado(body) {
  const { rows } = await pool.query('INSERT INTO certificados (orden_id, folio, firma_url) VALUES ($1,$2,$3) RETURNING *', [body.orden_id, body.folio, body.firma_url || null])
  return rows[0]
}
export async function updateCertificado(id, body) {
  const { rows } = await pool.query('UPDATE certificados SET folio = COALESCE($2, folio), firma_url = COALESCE($3, firma_url), updated_at = NOW() WHERE id = $1 OR orden_id = $1 RETURNING *', [id, body.folio, body.firma_url])
  if (!rows[0]) throw new AppError('Certificado no encontrado', 404)
  return rows[0]
}

export async function listActividades(ordenId) {
  const { rows } = await pool.query('SELECT * FROM actividades_servicio WHERE ($1::uuid IS NULL OR orden_id = $1) ORDER BY created_at DESC', [ordenId || null])
  return rows
}
export async function createActividad(body) {
  const { rows } = await pool.query('INSERT INTO actividades_servicio (id, orden_id, descripcion) VALUES (COALESCE($1, gen_random_uuid()), $2, $3) RETURNING *', [body.id || null, body.orden_id, body.descripcion])
  return rows[0]
}
export async function updateActividad(id, body) {
  const { rows } = await pool.query('UPDATE actividades_servicio SET descripcion = COALESCE($2, descripcion), updated_at = NOW() WHERE id = $1 RETURNING *', [id, body.descripcion])
  return rows[0]
}
export async function deleteActividad(id) { await pool.query('DELETE FROM actividades_servicio WHERE id = $1', [id]) }

export async function listFotos(ordenId) {
  const { rows } = await pool.query('SELECT * FROM fotos_servicio WHERE ($1::uuid IS NULL OR orden_id = $1) ORDER BY created_at DESC', [ordenId || null])
  return rows
}
export async function createFoto(body) {
  const { rows } = await pool.query('INSERT INTO fotos_servicio (id, orden_id, url, descripcion, storage_path) VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5) RETURNING *', [body.id || null, body.orden_id, body.url, body.descripcion || null, body.storage_path || null])
  return rows[0]
}
export async function deleteFoto(id) { await pool.query('DELETE FROM fotos_servicio WHERE id = $1', [id]) }

export async function listEstaciones(ordenId) {
  const { rows } = await pool.query('SELECT * FROM estaciones_usadas WHERE ($1::uuid IS NULL OR orden_id = $1) ORDER BY created_at DESC', [ordenId || null])
  return rows
}
export async function createEstacion(body) {
  const { rows } = await pool.query(
    `INSERT INTO estaciones_usadas (id, orden_id, tipo_estacion, cantidad, observaciones, foto_antes_url, foto_despues_url)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7) RETURNING *`,
    [body.id || null, body.orden_id, body.tipo_estacion, body.cantidad || 0, body.observaciones || null, body.foto_antes_url || null, body.foto_despues_url || null]
  )
  return rows[0]
}
export async function deleteEstacion(id) { await pool.query('DELETE FROM estaciones_usadas WHERE id = $1', [id]) }
export async function deleteEstacionesByOrden(ordenId) { await pool.query('DELETE FROM estaciones_usadas WHERE orden_id = $1', [ordenId]) }

export async function listProductos(ordenId) {
  const { rows } = await pool.query('SELECT * FROM productos_usados WHERE ($1::uuid IS NULL OR orden_id = $1) ORDER BY created_at DESC', [ordenId || null])
  return rows
}
export async function createProducto(body) {
  const { rows } = await pool.query(
    `INSERT INTO productos_usados (id, orden_id, nombre_producto, ingrediente_activo, cantidad, tipo_producto)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6) RETURNING *`,
    [body.id || null, body.orden_id, body.nombre_producto || null, body.ingrediente_activo || null, body.cantidad || null, body.tipo_producto || null]
  )
  return rows[0]
}
export async function deleteProducto(id) { await pool.query('DELETE FROM productos_usados WHERE id = $1', [id]) }

export async function listSolicitudes(user, filters = {}) {
  let sql = `
    SELECT s.*, row_to_json(c) AS clientes
    FROM solicitudes_servicio s
    LEFT JOIN clientes c ON c.id = s.cliente_id
  `
  const params = []
  const conditions = []
  
  if (user.role === 'cliente') {
    const profile = await getProfile(user.id)
    params.push(profile?.cliente_id || null)
    conditions.push(`s.cliente_id = $${params.length}`)
  }

  if (filters.filter && filters.filter !== 'todas') {
    if (filters.filter === 'historial') {
      conditions.push(`s.estado IN ('rechazada', 'convertida')`)
    } else {
      params.push(filters.filter)
      conditions.push(`s.estado = $${params.length}`)
    }
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }
  
  sql += ' ORDER BY s.created_at DESC'
  const { rows } = await pool.query(sql, params)
  return rows
}
export async function createSolicitud(body, user) {
  const profile = await getProfile(user.id)
  const clienteId = body.cliente_id || profile?.cliente_id
  if (!clienteId) throw new AppError('cliente_id es obligatorio', 400)
  const { rows } = await pool.query(
    `INSERT INTO solicitudes_servicio (cliente_id, tipo_servicio, descripcion, direccion, fecha_preferida, estado)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [clienteId, body.tipo_servicio, body.descripcion, body.direccion || null, body.fecha_preferida || null, body.estado || 'pendiente']
  )
  return rows[0]
}
export async function updateSolicitud(id, body) {
  const keys = ['estado', 'precio_cotizacion', 'descripcion_cotizacion', 'respuesta_cliente', 'respuesta_fecha', 'motivo_rechazo', 'cotizacion_leida_por_cliente', 'orden_id']
  const sets = []
  const vals = []
  for (const key of keys) {
    if (body[key] !== undefined) {
      vals.push(body[key])
      sets.push(`${key} = $${vals.length}`)
    }
  }
  if (!sets.length) throw new AppError('No hay campos para actualizar', 400)
  vals.push(id)
  const { rows } = await pool.query(`UPDATE solicitudes_servicio SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`, vals)
  return rows[0]
}
export async function deleteSolicitud(id) { await pool.query('DELETE FROM solicitudes_servicio WHERE id = $1', [id]) }

export async function countSolicitudes(filters = {}) {
  const params = []
  const conditions = []
  
  if (filters.estado) {
    const estados = filters.estado.split(',')
    params.push(estados)
    conditions.push(`estado = ANY($${params.length})`)
  }
  
  if (filters.updated_after) {
    params.push(filters.updated_after)
    conditions.push(`updated_at > $${params.length}`)
  }
  
  let sql = 'SELECT COUNT(*) FROM solicitudes_servicio'
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }
  
  const { rows } = await pool.query(sql, params)
  return parseInt(rows[0].count, 10)
}
