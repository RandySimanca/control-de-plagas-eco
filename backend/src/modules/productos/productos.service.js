import { pool } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Ajusta el stock de un producto (dentro de una transacción o conexión existente).
 * @param {string} productoId - UUID del producto en productos_catalogo
 * @param {number} delta - Positivo = entrada, Negativo = salida
 * @param {'entrada'|'salida'|'ajuste_manual'} tipo - Tipo de movimiento
 * @param {string|null} referenciaId - UUID de la orden u otro recurso relacionado
 * @param {string|null} referenciaTipo - 'orden_servicio' | 'reabastecimiento' | 'ajuste_manual'
 * @param {number|null} cantidadPresentaciones - Solo para entradas por reabastecimiento
 * @param {string|null} notas - Observaciones del movimiento
 * @param {string|null} userId - UUID del usuario que realiza el movimiento
 * @param {object} client - Cliente de pg (pool o transacción)
 */
async function _ajustarStock(
  productoId, delta, tipo, referenciaId, referenciaTipo,
  cantidadPresentaciones, notas, userId, client
) {
  // Verificar que el stock no baje de 0 para salidas
  if (delta < 0) {
    const { rows } = await client.query(
      'SELECT stock_actual FROM productos_catalogo WHERE id = $1 FOR UPDATE',
      [productoId]
    );
    if (!rows[0]) throw new AppError('Producto de catálogo no encontrado', 404);
    // No bloqueamos, solo advertimos (el frontend ya habrá mostrado el warning)
  }

  await client.query(
    `UPDATE productos_catalogo
     SET stock_actual = GREATEST(0, stock_actual + $2), updated_at = NOW()
     WHERE id = $1`,
    [productoId, delta]
  );

  await client.query(
    `INSERT INTO movimientos_stock
       (producto_id, tipo, cantidad, cantidad_presentaciones, referencia_tipo, referencia_id, notas, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      productoId,
      tipo,
      Math.abs(delta),
      cantidadPresentaciones || null,
      referenciaTipo || null,
      referenciaId || null,
      notas || null,
      userId || null
    ]
  );
}

// ─── CATÁLOGO ─────────────────────────────────────────────────────────────────

export async function listProductosCatalogo(filters = {}) {
  const params = [];
  const conditions = [];

  if (filters.estado) {
    params.push(filters.estado);
    conditions.push(`estado = $${params.length}`);
  }
  if (filters.tipo_producto) {
    params.push(filters.tipo_producto);
    conditions.push(`tipo_producto = $${params.length}`);
  }
  if (filters.categoria) {
    params.push(filters.categoria);
    conditions.push(`categoria = $${params.length}`);
  }
  if (filters.stock_bajo === 'true') {
    conditions.push(`stock_actual <= stock_minimo AND stock_minimo > 0`);
  }

  let sql = 'SELECT * FROM productos_catalogo';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY nombre_comercial ASC';

  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function createProductoCatalogo(body) {
  const {
    nombre_comercial,
    ingrediente_activo,
    dosis_recomendada,
    tipo_producto,
    ficha_seguridad_url,
    estado,
    categoria,
    unidad_base,
    stock_actual,
    stock_minimo,
    presentacion_compra,
    factor_conversion
  } = body;

  const { rows } = await pool.query(
    `INSERT INTO productos_catalogo (
       nombre_comercial, ingrediente_activo, dosis_recomendada, tipo_producto,
       ficha_seguridad_url, estado, categoria, unidad_base, stock_actual,
       stock_minimo, presentacion_compra, factor_conversion
     )
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,'activo'),$7,$8,COALESCE($9,0),COALESCE($10,0),$11,COALESCE($12,1))
     RETURNING *`,
    [
      nombre_comercial,
      ingrediente_activo || null,
      dosis_recomendada || null,
      tipo_producto || null,
      ficha_seguridad_url || null,
      estado || 'activo',
      categoria || 'otro',
      unidad_base || 'unidad',
      stock_actual != null ? parseFloat(stock_actual) : 0,
      stock_minimo != null ? parseFloat(stock_minimo) : 0,
      presentacion_compra || null,
      factor_conversion != null ? parseFloat(factor_conversion) : 1
    ]
  );

  // Si se crea con stock inicial > 0, registrar el movimiento de entrada
  const prod = rows[0];
  if (parseFloat(prod.stock_actual || 0) > 0) {
    await pool.query(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_tipo, notas)
       VALUES ($1, 'entrada', $2, 'ajuste_manual', 'Stock inicial al crear producto')`,
      [prod.id, prod.stock_actual]
    );
  }

  return prod;
}

export async function updateProductoCatalogo(id, body) {
  const allowed = [
    'nombre_comercial', 'ingrediente_activo', 'dosis_recomendada', 'tipo_producto',
    'ficha_seguridad_url', 'estado', 'categoria', 'unidad_base',
    'stock_minimo', 'presentacion_compra', 'factor_conversion'
  ];
  const sets = [];
  const vals = [];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      vals.push(body[key]);
      sets.push(`${key} = $${vals.length}`);
    }
  }
  if (!sets.length) throw new AppError('No hay campos para actualizar', 400);
  vals.push(id);
  const { rows } = await pool.query(
    `UPDATE productos_catalogo SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`,
    vals
  );
  if (!rows[0]) throw new AppError('Producto no encontrado', 404);
  return rows[0];
}

export async function deleteProductoCatalogo(id) {
  const { rowCount } = await pool.query('DELETE FROM productos_catalogo WHERE id = $1', [id]);
  if (!rowCount) throw new AppError('Producto no encontrado', 404);
}

// ─── STOCK ────────────────────────────────────────────────────────────────────

/**
 * Reabastecer stock: el admin ingresa N presentaciones de compra.
 * La cantidad en unidad_base = N × factor_conversion.
 */
export async function reabastecerStock(productoId, cantidadPresentaciones, notas, userId) {
  const { rows } = await pool.query(
    'SELECT factor_conversion, unidad_base FROM productos_catalogo WHERE id = $1',
    [productoId]
  );
  if (!rows[0]) throw new AppError('Producto no encontrado', 404);

  const { factor_conversion, unidad_base } = rows[0];
  const delta = parseFloat(cantidadPresentaciones) * parseFloat(factor_conversion);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await _ajustarStock(
      productoId, delta, 'entrada', null, 'reabastecimiento',
      cantidadPresentaciones, notas, userId, client
    );
    await client.query('COMMIT');

    const { rows: updated } = await client.query(
      'SELECT * FROM productos_catalogo WHERE id = $1', [productoId]
    );
    return {
      producto: updated[0],
      delta,
      unidad_base,
      presentaciones: cantidadPresentaciones
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Ajuste manual de stock (corrección tras inventario físico).
 */
export async function ajusteManualStock(productoId, nuevoStock, notas, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT stock_actual, unidad_base FROM productos_catalogo WHERE id = $1 FOR UPDATE',
      [productoId]
    );
    if (!rows[0]) throw new AppError('Producto no encontrado', 404);

    const stockAnterior = parseFloat(rows[0].stock_actual);
    const stockNuevo = parseFloat(nuevoStock);
    const delta = stockNuevo - stockAnterior;

    await client.query(
      'UPDATE productos_catalogo SET stock_actual = $2, updated_at = NOW() WHERE id = $1',
      [productoId, stockNuevo]
    );

    await client.query(
      `INSERT INTO movimientos_stock
         (producto_id, tipo, cantidad, referencia_tipo, notas, created_by)
       VALUES ($1, 'ajuste_manual', $2, 'ajuste_manual', $3, $4)`,
      [productoId, Math.abs(delta), notas || `Ajuste manual: ${stockAnterior} → ${stockNuevo}`, userId || null]
    );

    await client.query('COMMIT');

    const { rows: updated } = await client.query(
      'SELECT * FROM productos_catalogo WHERE id = $1', [productoId]
    );
    return updated[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Historial de movimientos de un producto (paginado).
 */
export async function getMovimientosStock(productoId, limit = 50, offset = 0) {
  const { rows: prod } = await pool.query(
    'SELECT id FROM productos_catalogo WHERE id = $1', [productoId]
  );
  if (!prod[0]) throw new AppError('Producto no encontrado', 404);

  const { rows } = await pool.query(
    `SELECT m.*, p.nombre_completo AS usuario_nombre,
            (SELECT nombre_completo FROM profiles WHERE id = m.referencia_id AND m.referencia_tipo = 'asignacion_tecnico') AS tecnico_asignado
     FROM movimientos_stock m
     LEFT JOIN profiles p ON p.id = m.created_by
     WHERE m.producto_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2 OFFSET $3`,
    [productoId, limit, offset]
  );
  return rows;
}

/**
 * Asignar EPP a un técnico.
 */
export async function asignarTecnicoStock(productoId, tecnicoId, cantidad, notas, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT stock_actual, categoria FROM productos_catalogo WHERE id = $1 FOR UPDATE',
      [productoId]
    );
    if (!rows[0]) throw new AppError('Producto no encontrado', 404);
    if (!['epp', 'equipo'].includes(rows[0].categoria)) {
      throw new AppError('Solo se pueden asignar productos de categoría EPP o Equipo', 400);
    }
    
    if (parseFloat(rows[0].stock_actual) < cantidad) {
      throw new AppError('Stock insuficiente', 400);
    }

    const delta = -parseFloat(cantidad);

    await client.query(
      'UPDATE productos_catalogo SET stock_actual = stock_actual + $2, updated_at = NOW() WHERE id = $1',
      [productoId, delta]
    );

    await client.query(
      `INSERT INTO movimientos_stock
         (producto_id, tipo, cantidad, referencia_tipo, referencia_id, notas, created_by)
       VALUES ($1, 'salida', $2, 'asignacion_tecnico', $3, $4, $5)`,
      [productoId, Math.abs(delta), tecnicoId, notas || 'Asignación de dotación', userId || null]
    );

    await client.query('COMMIT');

    const { rows: updated } = await client.query(
      'SELECT * FROM productos_catalogo WHERE id = $1', [productoId]
    );
    return updated[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Exportar el helper para uso en operaciones.service.js
export { _ajustarStock };

// ─── AUDITORIA ────────────────────────────────────────────────────────────────

export async function getAuditoriaProductos(filters = {}) {
  const params = [];
  const conditions = [];

  if (filters.tecnico_id) {
    params.push(filters.tecnico_id);
    conditions.push(`o.tecnico_id = $${params.length}`);
  }
  if (filters.producto_id) {
    params.push(filters.producto_id);
    conditions.push(`pu.catalogo_id = $${params.length}`);
  }
  if (filters.cliente_id) {
    params.push(filters.cliente_id);
    conditions.push(`o.cliente_id = $${params.length}`);
  }
  if (filters.fecha_desde) {
    params.push(filters.fecha_desde);
    conditions.push(`o.fecha_programada >= $${params.length}`);
  }
  if (filters.fecha_hasta) {
    params.push(filters.fecha_hasta);
    conditions.push(`o.fecha_programada <= $${params.length}`);
  }

  let sql = `
    SELECT 
      pu.id,
      pu.nombre_comercial AS producto_nombre,
      pu.cantidad_numerica,
      pu.unidad,
      pu.cantidad AS cantidad_texto,
      o.id AS orden_id,
      o.fecha_programada,
      o.estado AS orden_estado,
      c.id AS cliente_id,
      c.nombre AS cliente_nombre,
      c.razon_social AS cliente_razon_social,
      p.id AS tecnico_id,
      p.nombre_completo AS tecnico_nombre,
      pc.nombre_comercial AS catalogo_nombre
    FROM productos_usados pu
    JOIN ordenes_servicio o ON o.id = pu.orden_id
    LEFT JOIN clientes c ON c.id = o.cliente_id
    LEFT JOIN profiles p ON p.id = o.tecnico_id
    LEFT JOIN productos_catalogo pc ON pc.id = pu.catalogo_id
  `;

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY o.fecha_programada DESC, pu.created_at DESC';

  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function getAuditoriaResumen(filters = {}) {
  const params = [];
  const conditions = [];

  if (filters.tecnico_id) {
    params.push(filters.tecnico_id);
    conditions.push(`o.tecnico_id = $${params.length}`);
  }
  if (filters.producto_id) {
    params.push(filters.producto_id);
    conditions.push(`pu.catalogo_id = $${params.length}`);
  }
  if (filters.cliente_id) {
    params.push(filters.cliente_id);
    conditions.push(`o.cliente_id = $${params.length}`);
  }
  if (filters.fecha_desde) {
    params.push(filters.fecha_desde);
    conditions.push(`o.fecha_programada >= $${params.length}`);
  }
  if (filters.fecha_hasta) {
    params.push(filters.fecha_hasta);
    conditions.push(`o.fecha_programada <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  // 1. Total de registros de productos usados
  let sqlTotal = `
    SELECT COUNT(*) as total
    FROM productos_usados pu
    JOIN ordenes_servicio o ON o.id = pu.orden_id
    ${whereClause}
  `;
  
  // 2. Total de órdenes distintas
  let sqlOrdenes = `
    SELECT COUNT(DISTINCT o.id) as total
    FROM productos_usados pu
    JOIN ordenes_servicio o ON o.id = pu.orden_id
    ${whereClause}
  `;

  // 3. Técnico con mayor consumo (por cantidad de registros)
  let sqlTecnico = `
    SELECT p.nombre_completo, COUNT(pu.id) as cantidad
    FROM productos_usados pu
    JOIN ordenes_servicio o ON o.id = pu.orden_id
    JOIN profiles p ON p.id = o.tecnico_id
    ${whereClause}
    GROUP BY p.id, p.nombre_completo
    ORDER BY cantidad DESC
    LIMIT 1
  `;

  // 4. Producto más usado
  let sqlProducto = `
    SELECT COALESCE(pc.nombre_comercial, pu.nombre_comercial, pu.ingrediente_activo) as nombre, COUNT(pu.id) as cantidad
    FROM productos_usados pu
    JOIN ordenes_servicio o ON o.id = pu.orden_id
    LEFT JOIN productos_catalogo pc ON pc.id = pu.catalogo_id
    ${whereClause}
    GROUP BY nombre
    ORDER BY cantidad DESC
    LIMIT 1
  `;

  const [resTotal, resOrdenes, resTecnico, resProducto] = await Promise.all([
    pool.query(sqlTotal, params),
    pool.query(sqlOrdenes, params),
    pool.query(sqlTecnico, params),
    pool.query(sqlProducto, params)
  ]);

  return {
    totalProductos: parseInt(resTotal.rows[0]?.total || 0),
    totalOrdenes: parseInt(resOrdenes.rows[0]?.total || 0),
    tecnicoTop: resTecnico.rows[0] ? { nombre: resTecnico.rows[0].nombre_completo, cantidad: parseInt(resTecnico.rows[0].cantidad) } : null,
    productoTop: resProducto.rows[0] ? { nombre: resProducto.rows[0].nombre, cantidad: parseInt(resProducto.rows[0].cantidad) } : null
  };
}

// ─── ACTIVOS FIJOS (EQUIPOS) ──────────────────────────────────────────────────

export async function getActivosByProducto(productoId) {
  const { rows } = await pool.query(`
    SELECT a.*, p.nombre_completo as tecnico_actual_nombre
    FROM equipos_activos a
    LEFT JOIN profiles p ON p.id = a.tecnico_actual_id
    WHERE a.producto_id = $1
    ORDER BY a.created_at DESC
  `, [productoId]);
  return rows;
}

export async function getActivosDisponibles() {
  const { rows } = await pool.query(`
    SELECT a.*, pc.nombre_comercial, pc.categoria
    FROM equipos_activos a
    JOIN productos_catalogo pc ON pc.id = a.producto_id
    WHERE a.estado = 'disponible'
    ORDER BY pc.nombre_comercial ASC, a.codigo_activo ASC
  `);
  return rows;
}

export async function createActivo(productoId, data) {
  const { codigo_activo, nombre, marca, modelo, numero_serie, estado, notas } = data;
  const { rows } = await pool.query(`
    INSERT INTO equipos_activos (producto_id, codigo_activo, nombre, marca, modelo, numero_serie, estado, notas)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    productoId, 
    codigo_activo, 
    nombre || null, 
    marca || null, 
    modelo || null, 
    numero_serie || null, 
    estado || 'disponible', 
    notas || null
  ]);
  return rows[0];
}

export async function deleteActivo(activoId) {
  // Solo se puede eliminar si está disponible o de baja. Prestado no debería borrarse.
  const { rows } = await pool.query('SELECT estado FROM equipos_activos WHERE id = $1', [activoId]);
  if (!rows[0]) throw new AppError('Activo no encontrado', 404);
  if (rows[0].estado === 'prestado') throw new AppError('No se puede eliminar un activo que está prestado', 400);
  
  await pool.query('DELETE FROM equipos_activos WHERE id = $1', [activoId]);
}

export async function updateActivoEstado(activoId, estado, notas) {
  const { rows } = await pool.query(`
    UPDATE equipos_activos 
    SET estado = $2, notas = COALESCE($3, notas), updated_at = NOW()
    WHERE id = $1 RETURNING *
  `, [activoId, estado, notas]);
  return rows[0];
}

export async function registrarPrestamoActivos(tecnicoId, activosIds, notas, adminId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const activoId of activosIds) {
      const { rows } = await client.query('SELECT estado FROM equipos_activos WHERE id = $1 FOR UPDATE', [activoId]);
      if (!rows[0] || rows[0].estado !== 'disponible') {
        throw new AppError('Uno o más activos no están disponibles', 400);
      }
      
      await client.query(`
        UPDATE equipos_activos 
        SET estado = 'prestado', tecnico_actual_id = $2, ultima_fecha_prestamo = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [activoId, tecnicoId]);
      
      await client.query(`
        INSERT INTO historial_prestamos_equipos (activo_id, tecnico_id, tipo_movimiento, notas, registrado_por)
        VALUES ($1, $2, 'salida', $3, $4)
      `, [activoId, tecnicoId, notas || null, adminId || null]);
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function registrarDevolucionActivos(tecnicoId, activosIds, notas, adminId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const activoId of activosIds) {
      const { rows } = await client.query('SELECT estado, tecnico_actual_id FROM equipos_activos WHERE id = $1 FOR UPDATE', [activoId]);
      if (!rows[0] || rows[0].estado !== 'prestado' || rows[0].tecnico_actual_id !== tecnicoId) {
        throw new AppError('Uno o más activos no están prestados a este técnico', 400);
      }
      
      await client.query(`
        UPDATE equipos_activos 
        SET estado = 'disponible', tecnico_actual_id = NULL, updated_at = NOW()
        WHERE id = $1
      `, [activoId]);
      
      await client.query(`
        INSERT INTO historial_prestamos_equipos (activo_id, tecnico_id, tipo_movimiento, notas, registrado_por)
        VALUES ($1, $2, 'entrada', $3, $4)
      `, [activoId, tecnicoId, notas || null, adminId || null]);
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getActivosPrestadosByTecnico(tecnicoId) {
  const { rows } = await pool.query(`
    SELECT a.*, pc.nombre_comercial, pc.categoria
    FROM equipos_activos a
    JOIN productos_catalogo pc ON pc.id = a.producto_id
    WHERE a.tecnico_actual_id = $1 AND a.estado = 'prestado'
    ORDER BY a.ultima_fecha_prestamo DESC
  `, [tecnicoId]);
  return rows;
}

