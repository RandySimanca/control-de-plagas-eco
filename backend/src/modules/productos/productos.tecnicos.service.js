import { pool } from '../../config/database.js'
import { AppError } from '../../utils/AppError.js'
import { _ajustarStock } from './productos.service.js'

export async function getInventarioTecnico(tecnicoId) {
  const sql = `
    SELECT 
      ti.*, 
      pc.nombre_comercial, 
      pc.unidad_base, 
      pc.tipo_producto, 
      pc.ingrediente_activo
    FROM tecnicos_inventario ti
    JOIN productos_catalogo pc ON pc.id = ti.catalogo_id
    WHERE ti.tecnico_id = $1 AND ti.estado = 'en_poder'
    ORDER BY pc.nombre_comercial
  `
  const { rows } = await pool.query(sql, [tecnicoId])
  return rows
}

export async function checkOutProductos(tecnicoId, items, userId) {
  // items: [{ catalogo_id, lote, cantidad }]
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const item of items) {
      const { catalogo_id, lote, cantidad } = item
      if (!catalogo_id || !cantidad || cantidad <= 0) continue

      // 1. Descontar de la bodega global
      await _ajustarStock(
        catalogo_id,
        -cantidad,
        'salida',
        tecnicoId, // referencia_id
        'asignacion_tecnico',
        null,
        lote, // Usaremos el lote como notas para trazabilidad o en la columna si la creamos
        userId,
        client
      )

      // Guardar lote explícitamente en el movimiento recién creado
      await client.query(
        `UPDATE movimientos_stock SET lote = $1 
         WHERE referencia_id = $2 AND referencia_tipo = 'asignacion_tecnico' 
         AND producto_id = $3 AND lote IS NULL 
         ORDER BY created_at DESC LIMIT 1`,
        [lote || null, tecnicoId, catalogo_id]
      )

      // 2. Sumar al inventario del técnico
      await client.query(
        `INSERT INTO tecnicos_inventario (tecnico_id, catalogo_id, lote, cantidad_sacada, cantidad_usada, estado)
         VALUES ($1, $2, $3, $4, 0, 'en_poder')`,
        [tecnicoId, catalogo_id, lote || null, cantidad]
      )
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function checkInProductos(tecnicoId, items, userId) {
  // items: [{ id (de tecnicos_inventario), cantidad_devuelta }]
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const item of items) {
      const { id, cantidad_devuelta } = item

      // Obtener el registro actual
      const { rows } = await client.query(`SELECT * FROM tecnicos_inventario WHERE id = $1 AND estado = 'en_poder'`, [id])
      if (!rows[0]) continue

      const inv = rows[0]
      // Verificar seguridad (que no devuelva más de lo que sacó - lo que usó)
      const sobranteReal = parseFloat(inv.cantidad_sacada) - parseFloat(inv.cantidad_usada)
      
      // La cantidad devuelta se ajusta a lo reportado
      const devolver = parseFloat(cantidad_devuelta || 0)

      if (devolver > 0) {
        // 1. Sumar a la bodega global
        await _ajustarStock(
          inv.catalogo_id,
          devolver,
          'entrada',
          tecnicoId, // referencia_id
          'devolucion_tecnico',
          null,
          `Devolución sobrante. Lote: ${inv.lote || 'N/A'}`,
          userId,
          client
        )
      }

      // Marcar como devuelto independientemente de la cantidad
      await client.query(
        `UPDATE tecnicos_inventario SET estado = 'devuelto', updated_at = NOW() WHERE id = $1`,
        [id]
      )
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
