import { pool } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';

export async function listOrdenes({ user, filters = {} }) {
  const params = [];
  let sql = `
    SELECT s.*,
           c.nombre AS cliente_nombre,
           c.email AS cliente_email,
           c.telefono AS cliente_telefono,
           c.direccion AS cliente_direccion,
           p.nombre_completo AS tecnico_nombre
    FROM ordenes_servicio s
    JOIN clientes c ON c.id = s.cliente_id
    LEFT JOIN profiles p ON p.id = s.tecnico_id
  `;
  const conditions = [];

  if (user.role === 'tecnico') {
    conditions.push(`s.tecnico_id = $${params.length + 1}`);
    params.push(user.id);
  }

  if (filters.cliente_id) {
    conditions.push(`s.cliente_id = $${params.length + 1}`);
    params.push(filters.cliente_id);
  }
  if (filters.estado) {
    conditions.push(`s.estado = $${params.length + 1}`);
    params.push(filters.estado);
  }
  if (filters.tecnico_id) {
    conditions.push(`s.tecnico_id = $${params.length + 1}`);
    params.push(filters.tecnico_id);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY s.fecha_programada NULLS LAST, s.created_at DESC';

  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function getOrdenById(id, user) {
  const params = [id];
  let sql = `
    SELECT s.*,
           c.nombre AS cliente_nombre,
           c.email AS cliente_email,
           c.telefono AS cliente_telefono,
           c.direccion AS cliente_direccion,
           p.nombre_completo AS tecnico_nombre
    FROM ordenes_servicio s
    JOIN clientes c ON c.id = s.cliente_id
    LEFT JOIN profiles p ON p.id = s.tecnico_id
    WHERE s.id = $1
  `;

  if (user.role === 'tecnico') {
    sql += ` AND s.tecnico_id = $2`;
    params.push(user.id);
  }

  const { rows } = await pool.query(sql, params);
  if (!rows[0]) {
    throw new AppError('Orden no encontrada', 404);
  }
  return rows[0];
}

export async function createOrden(body, user) {
  if (user.role !== 'admin') {
    throw new AppError('Solo administradores pueden crear órdenes', 403);
  }
  if (!body.cliente_id) {
    throw new AppError('cliente_id es obligatorio', 400);
  }

  const { rows: [row] } = await pool.query(
    `INSERT INTO ordenes_servicio (
       cliente_id, tecnico_id, fecha_programada,
       tipo_plaga, observaciones, estado
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      body.cliente_id,
      body.tecnico_id || null,
      body.fecha_programada || null,
      body.tipo_plaga || null,
      body.observaciones?.trim() || null,
      body.estado || 'programada'
    ]
  );
  return row;
}

export async function updateOrden(id, body, user) {
  const current = await getOrdenById(id, user);

  if (user.role === 'admin') {
    const fields = [];
    const values = [];
    let idx = 1;

    if (body.cliente_id !== undefined) { fields.push(`cliente_id = $${idx}`); values.push(body.cliente_id); idx++; }
    if (body.tecnico_id !== undefined) { fields.push(`tecnico_id = $${idx}`); values.push(body.tecnico_id); idx++; }
    if (body.fecha_programada !== undefined) { fields.push(`fecha_programada = $${idx}`); values.push(body.fecha_programada); idx++; }
    if (body.tipo_plaga !== undefined) { fields.push(`tipo_plaga = $${idx}`); values.push(body.tipo_plaga); idx++; }
    if (body.observaciones !== undefined) { fields.push(`observaciones = $${idx}`); values.push(body.observaciones ? body.observaciones.trim() : null); idx++; }
    if (body.estado !== undefined) {
      const allowed = ['pendiente','en_proceso','terminado','programada','en_progreso','completada'];
      if (!allowed.includes(body.estado)) throw new AppError('Estado inválido', 400);
      fields.push(`estado = $${idx}`); values.push(body.estado); idx++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    const sql = `UPDATE ordenes_servicio SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(sql, values);
    return rows[0];
  }

  // Technician
  if (body.estado === undefined) {
    throw new AppError('Los técnicos solo pueden actualizar el estado', 400);
  }
  const allowed = ['pendiente','en_proceso','terminado','programada','en_progreso','completada'];
  if (!allowed.includes(body.estado)) throw new AppError('Estado inválido', 400);
  const { rows } = await pool.query(
    `UPDATE ordenes_servicio SET estado = $1, updated_at = NOW() WHERE id = $2 AND tecnico_id = $3 RETURNING *`,
    [body.estado, id, user.id]
  );
  if (!rows[0]) throw new AppError('Orden no encontrada o no autorizada', 404);
  return rows[0];
}

export async function assignTecnico(ordenId, tecnicoId, user) {
  if (user.role !== 'admin') {
    throw new AppError('Solo administradores pueden asignar técnicos', 403);
  }
  if (tecnicoId) {
    const { rows } = await pool.query(`SELECT id FROM profiles WHERE id = $1 AND activo = true`, [tecnicoId]);
    if (!rows[0]) {
      throw new AppError('Técnico no encontrado o inactivo', 400);
    }
  }
  const { rows } = await pool.query(
    `UPDATE ordenes_servicio SET tecnico_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [tecnicoId || null, ordenId]
  );
  if (!rows[0]) {
    throw new AppError('Orden no encontrada', 404);
  }
  return rows[0];
}

export async function deleteOrden(id, user) {
  if (user.role !== 'admin') {
    throw new AppError('Solo administradores pueden eliminar órdenes', 403);
  }
  const { rowCount } = await pool.query(`DELETE FROM ordenes_servicio WHERE id = $1`, [id]);
  if (!rowCount) {
    throw new AppError('Orden no encontrada', 404);
  }
}
