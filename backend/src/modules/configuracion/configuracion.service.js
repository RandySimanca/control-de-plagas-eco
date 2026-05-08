import { pool } from '../../config/database.js';

export async function getConfig() {
  const { rows } = await pool.query('SELECT * FROM configuracion LIMIT 1');
  return rows[0] || null;
}

export async function createConfig(data) {
  const {
    nombre_empresa,
    nit,
    email_contacto,
    telefono_contacto,
    direccion_fiscal,
    footer_pdf,
    logo_url,
    recomendaciones_generales,
    version_informe,
    fecha_modelo_informe
  } = data;

  const { rows } = await pool.query(`
    INSERT INTO configuracion 
      (nombre_empresa, nit, email_contacto, telefono_contacto, direccion_fiscal, footer_pdf, logo_url, recomendaciones_generales, version_informe, fecha_modelo_informe, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    RETURNING *
  `, [
    nombre_empresa,
    nit,
    email_contacto,
    telefono_contacto,
    direccion_fiscal,
    footer_pdf,
    logo_url,
    recomendaciones_generales,
    version_informe,
    fecha_modelo_informe
  ]);

  return rows[0];
}

export async function updateConfig(id, data) {
  const allowed = [
    'nombre_empresa', 'nit', 'email_contacto', 'telefono_contacto',
    'direccion_fiscal', 'footer_pdf', 'logo_url',
    'recomendaciones_generales', 'version_informe', 'fecha_modelo_informe'
  ];

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

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const query = `UPDATE configuracion SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  const { rows } = await pool.query(query, values);
  return rows[0];
}
