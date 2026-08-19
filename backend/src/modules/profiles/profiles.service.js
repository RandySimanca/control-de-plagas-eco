import { pool } from '../../config/database.js';

export async function listProfiles(filters = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (filters.cliente_id) {
    conditions.push(`p.cliente_id = $${idx}`);
    params.push(filters.cliente_id);
    idx++;
  }
  if (filters.rol) {
    conditions.push(`p.rol = $${idx}`);
    params.push(filters.rol);
    idx++;
  }
  if (filters.activo !== undefined) {
    conditions.push(`p.activo = $${idx}`);
    params.push(filters.activo);
    idx++;
  }

  let sql = `
    SELECT p.*, c.nombre as cliente_nombre
    FROM profiles p
    LEFT JOIN clientes c ON p.cliente_id = c.id
  `;
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ` ORDER BY p.nombre_completo`;

  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function getProfileById(id) {
  const { rows } = await pool.query(`
    SELECT p.*, c.nombre as cliente_nombre
    FROM profiles p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE p.id = $1
  `, [id]);
  return rows[0] || null;
}

export async function updateProfile(id, data) {
  const allowed = ['nombre_completo', 'email', 'telefono', 'rol', 'especialidad', 'firma_url', 'activo', 'cliente_id'];
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(data[key]);
      idx++;
    }
  }

  if (fields.length === 0) {
    return await getProfileById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const query = `UPDATE profiles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function deleteProfile(id) {
  await pool.query('DELETE FROM profiles WHERE id = $1', [id]);
  return { success: true };
}

// Helper to create or update profile after user registration
export async function upsertProfile(userId, data) {
  const { nombre_completo, email, telefono, rol, especialidad, cliente_id } = data;
  
  const existing = await getProfileById(userId);
  
  if (existing) {
    return await updateProfile(userId, data);
  } else {
    const { rows } = await pool.query(`
      INSERT INTO profiles (id, nombre_completo, email, telefono, rol, especialidad, cliente_id, activo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
    `, [userId, nombre_completo, email, telefono, rol, especialidad, cliente_id]);
    return rows[0];
  }
}

export async function getDotacionByTecnico(tecnicoId) {
  const { rows } = await pool.query(`
    SELECT m.id, m.cantidad, m.created_at, m.notas,
           p.nombre_comercial, p.unidad_base, p.categoria,
           u.nombre_completo AS asignado_por
    FROM movimientos_stock m
    JOIN productos_catalogo p ON p.id = m.producto_id
    LEFT JOIN profiles u ON u.id = m.created_by
    WHERE m.referencia_tipo = 'asignacion_tecnico' 
      AND m.referencia_id = $1
    ORDER BY m.created_at DESC
  `, [tecnicoId]);
  return rows;
}
