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
    factor_conversion,
    marca,
    modelo,
    numero_serie,
    codigo_activo,
    estado_fisico,
    lote,
    fecha_vencimiento
  } = body;

  // Validar unicidad de codigo_activo y numero_serie para equipos
  if (categoria === 'equipo') {
    if (codigo_activo) {
      const { rows: dup } = await pool.query(
        `SELECT id, nombre_comercial FROM productos_catalogo WHERE categoria = 'equipo' AND codigo_activo = $1 LIMIT 1`,
        [codigo_activo]
      );
      if (dup[0]) throw new AppError(
        `El código de activo "${codigo_activo}" ya está registrado para el equipo "${dup[0].nombre_comercial}". Cada equipo debe tener un código único.`,
        409
      );
    }
    if (numero_serie) {
      const { rows: dup } = await pool.query(
        `SELECT id, nombre_comercial FROM productos_catalogo WHERE categoria = 'equipo' AND numero_serie = $1 LIMIT 1`,
        [numero_serie]
      );
      if (dup[0]) throw new AppError(
        `El número de serie "${numero_serie}" ya está registrado para el equipo "${dup[0].nombre_comercial}". Cada equipo debe tener un serial único.`,
        409
      );
    }
  }

  const realStock = categoria === 'equipo' ? 1 : (stock_actual != null ? parseFloat(stock_actual) : 0);

  const { rows } = await pool.query(
    `INSERT INTO productos_catalogo (
       nombre_comercial, ingrediente_activo, dosis_recomendada, tipo_producto,
       ficha_seguridad_url, estado, categoria, unidad_base, stock_actual,
       stock_minimo, presentacion_compra, factor_conversion,
       marca, modelo, numero_serie, codigo_activo, estado_fisico,
       lote, fecha_vencimiento
     )
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,'activo'),$7,$8,$9,COALESCE($10,0),$11,COALESCE($12,1),$13,$14,$15,$16,COALESCE($17,'disponible'),$18,$19)
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
      realStock,
      stock_minimo != null ? parseFloat(stock_minimo) : 0,
      presentacion_compra || null,
      factor_conversion != null ? parseFloat(factor_conversion) : 1,
      marca || null,
      modelo || null,
      numero_serie || null,
      codigo_activo || null,
      estado_fisico || 'disponible',
      lote || null,
      fecha_vencimiento || null
    ]
  );

  // Si se crea con stock inicial > 0, registrar el movimiento de entrada (omitimos para equipos porque son únicos y se controlan por estado_prestamo)
  const prod = rows[0];
  if (parseFloat(prod.stock_actual || 0) > 0 && prod.categoria !== 'equipo') {
    await pool.query(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia_tipo, notas)
       VALUES ($1, 'entrada', $2, 'ajuste_manual', 'Stock inicial al crear producto')`,
      [prod.id, prod.stock_actual]
    );
  }

  return prod;
}

export async function updateProductoCatalogo(id, body) {
  // Validar unicidad de codigo_activo y numero_serie al editar equipos
  const currentRow = await pool.query('SELECT categoria FROM productos_catalogo WHERE id = $1', [id]);
  const esEquipo = currentRow.rows[0]?.categoria === 'equipo' || body.categoria === 'equipo';

  if (esEquipo) {
    if (body.codigo_activo) {
      const { rows: dup } = await pool.query(
        `SELECT id, nombre_comercial FROM productos_catalogo WHERE categoria = 'equipo' AND codigo_activo = $1 AND id != $2 LIMIT 1`,
        [body.codigo_activo, id]
      );
      if (dup[0]) throw new AppError(
        `El código de activo "${body.codigo_activo}" ya está registrado para el equipo "${dup[0].nombre_comercial}". Usa un código único.`,
        409
      );
    }
    if (body.numero_serie) {
      const { rows: dup } = await pool.query(
        `SELECT id, nombre_comercial FROM productos_catalogo WHERE categoria = 'equipo' AND numero_serie = $1 AND id != $2 LIMIT 1`,
        [body.numero_serie, id]
      );
      if (dup[0]) throw new AppError(
        `El número de serie "${body.numero_serie}" ya está registrado para el equipo "${dup[0].nombre_comercial}". Cada equipo debe tener un serial único.`,
        409
      );
    }
  }

  const allowed = [
    'nombre_comercial', 'ingrediente_activo', 'dosis_recomendada', 'tipo_producto',
    'ficha_seguridad_url', 'estado', 'categoria', 'unidad_base',
    'stock_minimo', 'presentacion_compra', 'factor_conversion',
    'marca', 'modelo', 'numero_serie', 'codigo_activo', 'estado_fisico',
    'lote', 'fecha_vencimiento'
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

    // Guardar en el inventario actual del técnico para que pueda verlo en su panel
    await client.query(
      `INSERT INTO tecnicos_inventario (tecnico_id, catalogo_id, cantidad_sacada, cantidad_usada, estado)
       VALUES ($1, $2, $3, 0, 'en_poder')`,
      [tecnicoId, productoId, Math.abs(delta)]
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
    conditions.push(`tecnico_id = $${params.length}`);
  }
  if (filters.producto_id) {
    params.push(filters.producto_id);
    conditions.push(`catalogo_id = $${params.length}`);
  }
  if (filters.cliente_id) {
    params.push(filters.cliente_id);
    conditions.push(`cliente_id = $${params.length}`);
  }
  if (filters.fecha_desde) {
    params.push(filters.fecha_desde);
    conditions.push(`fecha_programada >= $${params.length}`);
  }
  if (filters.fecha_hasta) {
    params.push(filters.fecha_hasta);
    conditions.push(`fecha_programada <= $${params.length}`);
  }
  if (filters.tipo_registro) {
    params.push(filters.tipo_registro);
    conditions.push(`tipo_registro = $${params.length}`);
  }

  let sql = `
    WITH base_data AS (
      SELECT 
        pu.id::text,
        pu.nombre_comercial AS producto_nombre,
        pu.cantidad_numerica,
        pu.unidad,
        pu.cantidad AS cantidad_texto,
        o.id::text AS orden_id,
        o.fecha_programada,
        o.estado AS orden_estado,
        c.id::text AS cliente_id,
        c.nombre AS cliente_nombre,
        c.razon_social AS cliente_razon_social,
        p.id::text AS tecnico_id,
        p.nombre_completo AS tecnico_nombre,
        pc.nombre_comercial AS catalogo_nombre,
        pc.id::text as catalogo_id,
        pu.created_at,
        'aplicacion' AS tipo_registro,
        NULL AS marca,
        NULL AS modelo,
        NULL AS codigo_activo,
        NULL AS lote,
        NULL AS fecha_vencimiento,
        NULL AS ficha_seguridad_url,
        NULL AS notas
      FROM productos_usados pu
      JOIN ordenes_servicio o ON o.id = pu.orden_id
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN profiles p ON p.id = o.tecnico_id
      LEFT JOIN productos_catalogo pc ON pc.id = pu.catalogo_id
      
      UNION ALL
      
      SELECT 
        ms.id::text,
        pc.nombre_comercial AS producto_nombre,
        ms.cantidad AS cantidad_numerica,
        pc.unidad_base AS unidad,
        ms.cantidad::text AS cantidad_texto,
        'EPP-' || ms.id AS orden_id,
        ms.created_at AS fecha_programada,
        'entregado' AS orden_estado,
        NULL AS cliente_id,
        'Uso Interno' AS cliente_nombre,
        'Asignación EPP' AS cliente_razon_social,
        p.id::text AS tecnico_id,
        p.nombre_completo AS tecnico_nombre,
        pc.nombre_comercial AS catalogo_nombre,
        pc.id::text as catalogo_id,
        ms.created_at,
        'epp' AS tipo_registro,
        pc.marca,
        pc.modelo,
        pc.codigo_activo,
        pc.lote,
        pc.fecha_vencimiento,
        pc.ficha_seguridad_url,
        ms.notas
      FROM movimientos_stock ms
      JOIN productos_catalogo pc ON pc.id = ms.producto_id
      JOIN profiles p ON p.id = ms.referencia_id
      WHERE ms.referencia_tipo = 'asignacion_tecnico'
        AND pc.categoria = 'epp'
    )
    SELECT * FROM base_data
  `;

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY fecha_programada DESC, created_at DESC';

  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function getAuditoriaResumen(filters = {}) {
  const params = [];
  const conditions = [];

  if (filters.tecnico_id) {
    params.push(filters.tecnico_id);
    conditions.push(`tecnico_id = $${params.length}`);
  }
  if (filters.producto_id) {
    params.push(filters.producto_id);
    conditions.push(`catalogo_id = $${params.length}`);
  }
  if (filters.cliente_id) {
    params.push(filters.cliente_id);
    conditions.push(`cliente_id = $${params.length}`);
  }
  if (filters.fecha_desde) {
    params.push(filters.fecha_desde);
    conditions.push(`fecha_programada >= $${params.length}`);
  }
  if (filters.fecha_hasta) {
    params.push(filters.fecha_hasta);
    conditions.push(`fecha_programada <= $${params.length}`);
  }
  if (filters.tipo_registro) {
    params.push(filters.tipo_registro);
    conditions.push(`tipo_registro = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  const cte = `
    WITH base_data AS (
      SELECT 
        pu.id::text,
        o.id::text AS orden_id,
        o.fecha_programada,
        c.id::text AS cliente_id,
        p.id::text AS tecnico_id,
        p.nombre_completo AS tecnico_nombre,
        pc.id::text as catalogo_id,
        COALESCE(pc.nombre_comercial, pu.nombre_comercial, pu.ingrediente_activo) as nombre_producto,
        'aplicacion' as tipo_registro
      FROM productos_usados pu
      JOIN ordenes_servicio o ON o.id = pu.orden_id
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN profiles p ON p.id = o.tecnico_id
      LEFT JOIN productos_catalogo pc ON pc.id = pu.catalogo_id
      
      UNION ALL
      
      SELECT 
        ms.id::text,
        'EPP-' || ms.id AS orden_id,
        ms.created_at AS fecha_programada,
        NULL AS cliente_id,
        p.id::text AS tecnico_id,
        p.nombre_completo AS tecnico_nombre,
        pc.id::text as catalogo_id,
        pc.nombre_comercial as nombre_producto,
        'epp' as tipo_registro
      FROM movimientos_stock ms
      JOIN productos_catalogo pc ON pc.id = ms.producto_id
      JOIN profiles p ON p.id = ms.referencia_id
      WHERE ms.referencia_tipo = 'asignacion_tecnico'
        AND pc.categoria = 'epp'
    )
  `;

  // 1. Total de registros de productos usados
  let sqlTotal = `
    ${cte}
    SELECT COUNT(*) as total
    FROM base_data
    ${whereClause}
  `;
  
  // 2. Total de órdenes distintas
  let sqlOrdenes = `
    ${cte}
    SELECT COUNT(DISTINCT orden_id) as total
    FROM base_data
    ${whereClause}
  `;

  // 3. Técnico con mayor consumo (por cantidad de registros)
  let sqlTecnico = `
    ${cte}
    SELECT tecnico_nombre as nombre_completo, COUNT(id) as cantidad
    FROM base_data
    ${whereClause}
    GROUP BY tecnico_id, tecnico_nombre
    ORDER BY cantidad DESC
    LIMIT 1
  `;

  // 4. Producto más usado
  let sqlProducto = `
    ${cte}
    SELECT nombre_producto as nombre, COUNT(id) as cantidad
    FROM base_data
    ${whereClause}
    GROUP BY nombre_producto
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

export async function getActivosDisponibles() {
  const { rows } = await pool.query(`
    SELECT *
    FROM productos_catalogo
    WHERE categoria = 'equipo' AND estado_prestamo = 'en_bodega' AND estado_fisico != 'baja' AND estado_fisico != 'perdido'
    ORDER BY nombre_comercial ASC, codigo_activo ASC
  `);
  return rows;
}

export async function registrarPrestamoActivos(tecnicoId, activosIds, notas, adminId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const activoId of activosIds) {
      const { rows } = await client.query('SELECT estado_prestamo FROM productos_catalogo WHERE id = $1 FOR UPDATE', [activoId]);
      if (!rows[0] || rows[0].estado_prestamo !== 'en_bodega') {
        throw new AppError('Uno o más equipos no están disponibles en bodega', 400);
      }
      
      await client.query(`
        UPDATE productos_catalogo 
        SET estado_prestamo = 'prestado', tecnico_actual_id = $2, ultima_fecha_prestamo = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [activoId, tecnicoId]);
      
      await client.query(`
        INSERT INTO historial_prestamos_equipos (producto_id, tecnico_id, tipo_movimiento, notas, registrado_por)
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
      const { rows } = await client.query('SELECT estado_prestamo, tecnico_actual_id FROM productos_catalogo WHERE id = $1 FOR UPDATE', [activoId]);
      if (!rows[0] || rows[0].estado_prestamo !== 'prestado' || rows[0].tecnico_actual_id !== tecnicoId) {
        throw new AppError('Uno o más equipos no están prestados a este técnico', 400);
      }
      
      await client.query(`
        UPDATE productos_catalogo 
        SET estado_prestamo = 'en_bodega', tecnico_actual_id = NULL, updated_at = NOW()
        WHERE id = $1
      `, [activoId]);
      
      await client.query(`
        INSERT INTO historial_prestamos_equipos (producto_id, tecnico_id, tipo_movimiento, notas, registrado_por)
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
    SELECT *
    FROM productos_catalogo
    WHERE categoria = 'equipo' AND tecnico_actual_id = $1 AND estado_prestamo = 'prestado'
    ORDER BY ultima_fecha_prestamo DESC
  `, [tecnicoId]);
  return rows;
}

