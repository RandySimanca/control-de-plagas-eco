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

export async function listOrdenes(user, filters = {}) {
  const profile = await getProfile(user.id)
  const params = []
  const where = []

  if (user.role === 'tecnico') {
    params.push(user.id)
    where.push(`o.tecnico_id = $${params.length}`)
  } else if (user.role === 'cliente') {
    params.push(profile?.cliente_id || null)
    where.push(`o.cliente_id = $${params.length}`)
  }

  // Advanced filters
  if (filters.cliente_id) {
    params.push(filters.cliente_id)
    where.push(`o.cliente_id = $${params.length}`)
  }
  if (filters.tecnico_id) {
    params.push(filters.tecnico_id)
    where.push(`o.tecnico_id = $${params.length}`)
  }
  if (filters.estado) {
    params.push(filters.estado)
    where.push(`o.estado = $${params.length}`)
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
  const isLavado = body.lavado_tanques === true
  const cantidadTanques = body.lavado_tanques_cantidad ? parseInt(body.lavado_tanques_cantidad, 10) : 0
  
  const { rows } = await pool.query(
    `INSERT INTO ordenes_servicio (cliente_id, tecnico_id, fecha_programada, tipo_plaga, observaciones, estado, lavado_tanques, lavado_tanques_cantidad, direccion_servicio)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      body.cliente_id,
      body.tecnico_id || null,
      body.fecha_programada || null,
      body.tipo_plaga || null,
      body.observaciones || null,
      body.estado || 'programada',
      isLavado,
      cantidadTanques,
      body.direccion_servicio || null
    ]
  )
  
  const newOrden = rows[0]
  
  if (isLavado && cantidadTanques > 0) {
    for (let i = 1; i <= cantidadTanques; i++) {
      await pool.query(
        `INSERT INTO tanques_servicio (orden_id, numero, nombre) VALUES ($1, $2, $3)`,
        [newOrden.id, `TQ-${String(i).padStart(3, '0')}`, `Tanque ${i}`]
      )
    }
  }
  
  return newOrden
}

export async function updateOrden(id, body, user) {
  await assertOrdenAccess(id, user)
  const allowed = ['cliente_id', 'tecnico_id', 'fecha_programada', 'fecha_inicio', 'tipo_plaga', 'observaciones', 'estado', 'recomendaciones', 'areas_intervenidas', 'metodos_aplicacion', 'fecha_completada', 'lavado_tanques', 'lavado_tanques_cantidad', 'direccion_servicio']
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

export async function assignTecnico(ordenId, tecnicoId, user) {
  if (user.role !== 'admin') throw new AppError('Solo administradores', 403)
  const { rows } = await pool.query(
    'UPDATE ordenes_servicio SET tecnico_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [tecnicoId || null, ordenId]
  )
  if (!rows[0]) throw new AppError('Orden no encontrada', 404)
  return rows[0]
}

export async function getProductosByOrden(ordenId, user) {
  await assertOrdenAccess(ordenId, user)
  const { rows } = await pool.query('SELECT * FROM productos_usados WHERE orden_id = $1 ORDER BY created_at DESC', [ordenId])
  return rows
}
export async function getFotosByOrden(ordenId, user) {
  await assertOrdenAccess(ordenId, user)
  const { rows } = await pool.query('SELECT * FROM fotos_servicio WHERE orden_id = $1 ORDER BY created_at DESC', [ordenId])
  return rows
}
export async function getActividadesByOrden(ordenId, user) {
  await assertOrdenAccess(ordenId, user)
  const { rows } = await pool.query('SELECT * FROM actividades_servicio WHERE orden_id = $1 ORDER BY created_at DESC', [ordenId])
  return rows
}
export async function getEstacionesByOrden(ordenId, user) {
  await assertOrdenAccess(ordenId, user)
  const { rows: estaciones } = await pool.query('SELECT * FROM estaciones_usadas WHERE orden_id = $1 ORDER BY created_at DESC', [ordenId])
  
  if (estaciones.length > 0) {
    const ids = estaciones.map(e => e.id)
    const { rows: fotos } = await pool.query('SELECT * FROM fotos_estaciones_usadas WHERE estacion_usada_id = ANY($1) ORDER BY created_at ASC', [ids])
    for (const e of estaciones) {
      e.fotos = fotos.filter(f => f.estacion_usada_id === e.id)
    }
  }
  
  return estaciones
}
export async function getLatestCertificadoByOrden(ordenId, user) {
  await assertOrdenAccess(ordenId, user)
  // Los clientes solo pueden ver certificados aprobados
  const aprobadoFilter = user.role === 'cliente' ? ' AND aprobado = true' : ''
  const { rows } = await pool.query(`SELECT * FROM certificados WHERE orden_id = $1${aprobadoFilter} ORDER BY created_at DESC LIMIT 1`, [ordenId])
  return rows[0] || null
}

export async function listCertificados(user) {
  const params = []
  const conditions = []

  if (user.role === 'tecnico') {
    params.push(user.id)
    conditions.push(`o.tecnico_id = $${params.length}`)
  } else if (user.role === 'cliente') {
    const profile = await getProfile(user.id)
    params.push(profile?.cliente_id || null)
    conditions.push(`o.cliente_id = $${params.length}`)
    // Los clientes solo ven certificados aprobados por el admin
    conditions.push('c.aprobado = true')
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

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

export async function aprobarCertificado(id, user) {
  if (user.role !== 'admin') throw new AppError('Solo administradores pueden aprobar certificados', 403)
  const { rows } = await pool.query(
    `UPDATE certificados
     SET aprobado = true, aprobado_por = $2, fecha_aprobacion = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, user.id]
  )
  if (!rows[0]) throw new AppError('Certificado no encontrado', 404)
  return rows[0]
}

export async function rechazarCertificado(id, user) {
  if (user.role !== 'admin') throw new AppError('Solo administradores pueden gestionar certificados', 403)
  const { rows } = await pool.query(
    `UPDATE certificados
     SET aprobado = false, aprobado_por = NULL, fecha_aprobacion = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  )
  if (!rows[0]) throw new AppError('Certificado no encontrado', 404)
  return rows[0]
}
export async function createCertificado(body, user) {
  await assertOrdenAccess(body.orden_id, user)
  const { rows } = await pool.query('INSERT INTO certificados (orden_id, folio, firma_url) VALUES ($1,$2,$3) RETURNING *', [body.orden_id, body.folio, body.firma_url || null])
  return rows[0]
}
export async function updateCertificado(id, body, user) {
  // Primero buscamos a qué orden pertenece el certificado
  const { rows: certRows } = await pool.query('SELECT orden_id FROM certificados WHERE id = $1 OR orden_id = $1', [id])
  if (certRows[0]) await assertOrdenAccess(certRows[0].orden_id, user)
  
  const { rows } = await pool.query('UPDATE certificados SET folio = COALESCE($2, folio), firma_url = COALESCE($3, firma_url), updated_at = NOW() WHERE id = $1 OR orden_id = $1 RETURNING *', [id, body.folio, body.firma_url])
  if (!rows[0]) throw new AppError('Certificado no encontrado', 404)
  return rows[0]
}

export async function listActividades(ordenId, user) {
  if (ordenId) await assertOrdenAccess(ordenId, user)
  else if (user.role !== 'admin') throw new AppError('orden_id es obligatorio', 400)
  
  const { rows } = await pool.query('SELECT * FROM actividades_servicio WHERE ($1::uuid IS NULL OR orden_id = $1) ORDER BY created_at DESC', [ordenId || null])
  return rows
}
export async function createActividad(body, user) {
  await assertOrdenAccess(body.orden_id, user)
  const { rows } = await pool.query('INSERT INTO actividades_servicio (id, orden_id, descripcion) VALUES (COALESCE($1, gen_random_uuid()), $2, $3) RETURNING *', [body.id || null, body.orden_id, body.descripcion])
  return rows[0]
}
export async function updateActividad(id, body, user) {
  const { rows: actRows } = await pool.query('SELECT orden_id FROM actividades_servicio WHERE id = $1', [id])
  if (actRows[0]) await assertOrdenAccess(actRows[0].orden_id, user)
  const { rows } = await pool.query('UPDATE actividades_servicio SET descripcion = COALESCE($2, descripcion), updated_at = NOW() WHERE id = $1 RETURNING *', [id, body.descripcion])
  return rows[0]
}
export async function deleteActividad(id, user) {
  const { rows } = await pool.query('SELECT orden_id FROM actividades_servicio WHERE id = $1', [id])
  if (rows[0]) await assertOrdenAccess(rows[0].orden_id, user)
  await pool.query('DELETE FROM actividades_servicio WHERE id = $1', [id])
}

export async function listFotos(ordenId, user) {
  if (ordenId) await assertOrdenAccess(ordenId, user)
  else if (user.role !== 'admin') throw new AppError('orden_id es obligatorio', 400)
    
  const { rows } = await pool.query('SELECT * FROM fotos_servicio WHERE ($1::uuid IS NULL OR orden_id = $1) ORDER BY created_at DESC', [ordenId || null])
  return rows
}
export async function createFoto(body, user) {
  await assertOrdenAccess(body.orden_id, user)
  const { rows } = await pool.query('INSERT INTO fotos_servicio (id, orden_id, url, descripcion, storage_path) VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5) RETURNING *', [body.id || null, body.orden_id, body.url, body.descripcion || null, body.storage_path || null])
  return rows[0]
}
export async function deleteFoto(id, user) {
  const { rows } = await pool.query('SELECT orden_id FROM fotos_servicio WHERE id = $1', [id])
  if (rows[0]) await assertOrdenAccess(rows[0].orden_id, user)
  await pool.query('DELETE FROM fotos_servicio WHERE id = $1', [id])
}
export async function listEstaciones(ordenId, user) {
  if (ordenId) await assertOrdenAccess(ordenId, user)
  else if (user.role !== 'admin') throw new AppError('orden_id es obligatorio', 400)
    
  const { rows: estaciones } = await pool.query('SELECT * FROM estaciones_usadas WHERE ($1::uuid IS NULL OR orden_id = $1) ORDER BY created_at DESC', [ordenId || null])
  
  if (estaciones.length > 0) {
    const ids = estaciones.map(e => e.id)
    const { rows: fotos } = await pool.query('SELECT * FROM fotos_estaciones_usadas WHERE estacion_usada_id = ANY($1) ORDER BY created_at ASC', [ids])
    for (const e of estaciones) {
      e.fotos = fotos.filter(f => f.estacion_usada_id === e.id)
    }
  }
  
  return estaciones
}
export async function createEstacion(body, user) {
  await assertOrdenAccess(body.orden_id, user)
  const { rows } = await pool.query(
    `INSERT INTO estaciones_usadas (id, orden_id, tipo_estacion, cantidad, observaciones, foto_antes_url, foto_despues_url, es_nueva_instalacion)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [body.id || null, body.orden_id, body.tipo_estacion, body.cantidad || 0, body.observaciones || null, body.foto_antes_url || null, body.foto_despues_url || null, body.es_nueva_instalacion || false]
  )
  const estacion = rows[0]
  estacion.fotos = []
  return estacion
}
export async function deleteEstacion(id, user) {
  const { rows } = await pool.query('SELECT orden_id FROM estaciones_usadas WHERE id = $1', [id])
  if (rows[0]) await assertOrdenAccess(rows[0].orden_id, user)
  await pool.query('DELETE FROM estaciones_usadas WHERE id = $1', [id])
}
export async function deleteEstacionesByOrden(ordenId, user) {
  await assertOrdenAccess(ordenId, user)
  await pool.query('DELETE FROM estaciones_usadas WHERE orden_id = $1', [ordenId])
}

// --- FOTOS DE ESTACIONES ---
export async function createFotoEstacion(body, user) {
  const { rows: eRows } = await pool.query('SELECT orden_id FROM estaciones_usadas WHERE id = $1', [body.estacion_usada_id])
  if (eRows[0]) await assertOrdenAccess(eRows[0].orden_id, user)
  
  const { rows } = await pool.query(
    'INSERT INTO fotos_estaciones_usadas (estacion_usada_id, url, descripcion, storage_path) VALUES ($1,$2,$3,$4) RETURNING *',
    [body.estacion_usada_id, body.url, body.descripcion || null, body.storage_path || null]
  )
  return rows[0]
}

export async function deleteFotoEstacion(id, user) {
  const { rows: fRows } = await pool.query(`
    SELECT e.orden_id FROM fotos_estaciones_usadas f 
    JOIN estaciones_usadas e ON e.id = f.estacion_usada_id 
    WHERE f.id = $1
  `, [id])
  if (fRows[0]) await assertOrdenAccess(fRows[0].orden_id, user)
  await pool.query('DELETE FROM fotos_estaciones_usadas WHERE id = $1', [id])
}

export async function listProductos(ordenId, user) {
  if (ordenId) await assertOrdenAccess(ordenId, user)
  else if (user.role !== 'admin') throw new AppError('orden_id es obligatorio', 400)
    
  const { rows } = await pool.query('SELECT * FROM productos_usados WHERE ($1::uuid IS NULL OR orden_id = $1) ORDER BY created_at DESC', [ordenId || null])
  return rows
}
export async function createProducto(body, user) {
  await assertOrdenAccess(body.orden_id, user)
  const { rows } = await pool.query(
    `INSERT INTO productos_usados (id, orden_id, ingrediente_activo, cantidad, tipo_producto, dosis, nombre_comercial)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7) RETURNING *`,
    [body.id || null, body.orden_id, body.ingrediente_activo || null, body.cantidad || null, body.tipo_producto || null, body.dosis || null, body.nombre_comercial || null]
  )
  return rows[0]
}
export async function updateProducto(id, body, user) {
  const { rows: prodRows } = await pool.query('SELECT orden_id FROM productos_usados WHERE id = $1', [id])
  if (prodRows[0]) await assertOrdenAccess(prodRows[0].orden_id, user)
  const { rows } = await pool.query(
    `UPDATE productos_usados 
     SET ingrediente_activo = COALESCE($2, ingrediente_activo),
         cantidad = COALESCE($3, cantidad),
         tipo_producto = COALESCE($4, tipo_producto),
         dosis = COALESCE($5, dosis),
         nombre_comercial = COALESCE($6, nombre_comercial)
     WHERE id = $1 RETURNING *`,
    [id, body.ingrediente_activo, body.cantidad, body.tipo_producto, body.dosis, body.nombre_comercial]
  )
  if (!rows[0]) throw new AppError('Producto no encontrado', 404)
  return rows[0]
}
export async function deleteProducto(id, user) {
  const { rows } = await pool.query('SELECT orden_id FROM productos_usados WHERE id = $1', [id])
  if (rows[0]) await assertOrdenAccess(rows[0].orden_id, user)
  await pool.query('DELETE FROM productos_usados WHERE id = $1', [id])
}

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
export async function updateSolicitud(id, body, user) {
  const { rows: solRows } = await pool.query('SELECT cliente_id, estado FROM solicitudes_servicio WHERE id = $1', [id])
  if (!solRows[0]) throw new AppError('Solicitud no encontrada', 404)
  
  const sol = solRows[0]
  const profile = await getProfile(user.id)
  
  // Si es cliente, solo puede actualizar su propia solicitud y solo ciertos campos (aceptar/rechazar)
  if (user.role === 'cliente') {
    if (sol.cliente_id !== profile?.cliente_id) throw new AppError('No autorizado', 403)
    
    // Un cliente solo puede actualizar estos campos específicos al responder a una cotización
    const allowedClientKeys = ['estado', 'respuesta_cliente', 'respuesta_fecha', 'motivo_rechazo', 'cotizacion_leida_por_cliente']
    const keys = Object.keys(body).filter(k => allowedClientKeys.includes(k))
    
    if (keys.length === 0) throw new AppError('No tienes permiso para actualizar estos campos', 403)
    
    const sets = []
    const vals = []
    for (const key of keys) {
      vals.push(body[key])
      sets.push(`${key} = $${vals.length}`)
    }
    vals.push(id)
    const { rows } = await pool.query(`UPDATE solicitudes_servicio SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`, vals)
    return rows[0]
  }
  
  // Si es admin, tiene acceso completo
  if (user.role === 'admin') {
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

  throw new AppError('No autorizado', 403)
}
export async function deleteSolicitud(id, user) {
  const { rows: solRows } = await pool.query('SELECT cliente_id FROM solicitudes_servicio WHERE id = $1', [id])
  if (!solRows[0]) return // Ya no existe
  
  const profile = await getProfile(user.id)
  if (user.role !== 'admin' && solRows[0].cliente_id !== profile?.cliente_id) {
    throw new AppError('No autorizado', 403)
  }
  
  await pool.query('DELETE FROM solicitudes_servicio WHERE id = $1', [id])
}

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

// --- LAVADO DE TANQUES ---

export async function getTanquesByOrden(ordenId, user) {
  await assertOrdenAccess(ordenId, user)
  
  const { rows: tanques } = await pool.query('SELECT * FROM tanques_servicio WHERE orden_id = $1 ORDER BY created_at ASC', [ordenId])
  if (!tanques.length) return []
  
  const tanqueIds = tanques.map(t => t.id)
  
  const { rows: bitacoras } = await pool.query('SELECT * FROM bitacora_tanques WHERE tanque_id = ANY($1) ORDER BY created_at ASC', [tanqueIds])
  
  const bitacoraIds = bitacoras.map(b => b.id)
  let fotos = []
  
  if (bitacoraIds.length) {
    const { rows: fotosRows } = await pool.query('SELECT * FROM fotos_bitacora_tanques WHERE bitacora_id = ANY($1) ORDER BY created_at ASC', [bitacoraIds])
    fotos = fotosRows
  }
  
  for (const b of bitacoras) {
    b.fotos = fotos.filter(f => f.bitacora_id === b.id)
  }
  
  for (const t of tanques) {
    t.bitacora = bitacoras.filter(b => b.tanque_id === t.id)
  }
  
  return tanques
}

export async function createTanque(body, user) {
  await assertOrdenAccess(body.orden_id, user)
  const { rows } = await pool.query(
    'INSERT INTO tanques_servicio (orden_id, numero, nombre, foto_url, tipo_tanque, material, capacidad_valor, capacidad_unidad, ubicacion) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [body.orden_id, body.numero || '', body.nombre || '', body.foto_url, body.tipo_tanque, body.material, body.capacidad_valor, body.capacidad_unidad, body.ubicacion]
  )
  return rows[0]
}

export async function updateTanque(id, body, user) {
  const { rows: tRows } = await pool.query('SELECT orden_id FROM tanques_servicio WHERE id = $1', [id])
  if (tRows[0]) await assertOrdenAccess(tRows[0].orden_id, user)
  
  const allowed = ['numero', 'nombre', 'foto_url', 'tipo_tanque', 'material', 'capacidad_valor', 'capacidad_unidad', 'ubicacion']
  const sets = []
  const vals = []
  for (const key of allowed) {
    if (body[key] !== undefined) {
      vals.push(body[key])
      sets.push(`${key} = $${vals.length}`)
    }
  }
  if (!sets.length) return tRows[0]
  vals.push(id)
  const { rows } = await pool.query(`UPDATE tanques_servicio SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals)
  return rows[0]
}

export async function deleteTanque(id, user) {
  const { rows: tRows } = await pool.query('SELECT orden_id FROM tanques_servicio WHERE id = $1', [id])
  if (tRows[0]) await assertOrdenAccess(tRows[0].orden_id, user)
  await pool.query('DELETE FROM tanques_servicio WHERE id = $1', [id])
}

export async function createBitacoraTanque(body, user) {
  const { rows: tRows } = await pool.query('SELECT orden_id FROM tanques_servicio WHERE id = $1', [body.tanque_id])
  if (tRows[0]) await assertOrdenAccess(tRows[0].orden_id, user)
  
  const { rows } = await pool.query(
    'INSERT INTO bitacora_tanques (tanque_id, tipo_evento, descripcion) VALUES ($1,$2,$3) RETURNING *',
    [body.tanque_id, body.tipo_evento, body.descripcion]
  )
  return rows[0]
}

export async function updateBitacoraTanque(id, body, user) {
  const { rows: bRows } = await pool.query(`
    SELECT t.orden_id FROM bitacora_tanques b JOIN tanques_servicio t ON t.id = b.tanque_id WHERE b.id = $1
  `, [id])
  if (bRows[0]) await assertOrdenAccess(bRows[0].orden_id, user)
  
  const { rows } = await pool.query(
    'UPDATE bitacora_tanques SET tipo_evento = COALESCE($2, tipo_evento), descripcion = COALESCE($3, descripcion) WHERE id = $1 RETURNING *',
    [id, body.tipo_evento, body.descripcion]
  )
  return rows[0]
}

export async function deleteBitacoraTanque(id, user) {
  const { rows: bRows } = await pool.query(`
    SELECT t.orden_id FROM bitacora_tanques b JOIN tanques_servicio t ON t.id = b.tanque_id WHERE b.id = $1
  `, [id])
  if (bRows[0]) await assertOrdenAccess(bRows[0].orden_id, user)
  await pool.query('DELETE FROM bitacora_tanques WHERE id = $1', [id])
}

export async function createFotoBitacoraTanque(body, user) {
  const { rows: bRows } = await pool.query(`
    SELECT t.orden_id FROM bitacora_tanques b JOIN tanques_servicio t ON t.id = b.tanque_id WHERE b.id = $1
  `, [body.bitacora_id])
  if (bRows[0]) await assertOrdenAccess(bRows[0].orden_id, user)
  
  const { rows } = await pool.query(
    'INSERT INTO fotos_bitacora_tanques (bitacora_id, url, descripcion, storage_path) VALUES ($1,$2,$3,$4) RETURNING *',
    [body.bitacora_id, body.url, body.descripcion, body.storage_path]
  )
  return rows[0]
}

export async function deleteFotoBitacoraTanque(id, user) {
  const { rows: fRows } = await pool.query(`
    SELECT t.orden_id FROM fotos_bitacora_tanques f JOIN bitacora_tanques b ON b.id = f.bitacora_id JOIN tanques_servicio t ON t.id = b.tanque_id WHERE f.id = $1
  `, [id])
  if (fRows[0]) await assertOrdenAccess(fRows[0].orden_id, user)
  await pool.query('DELETE FROM fotos_bitacora_tanques WHERE id = $1', [id])
}
