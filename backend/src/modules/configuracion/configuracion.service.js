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
    fecha_modelo_informe,
    especies_causantes,
    representante_legal_nombre,
    representante_legal_cargo,
    representante_legal_firma_url,
    vigencia_certificado_meses
  } = data;

  const { rows } = await pool.query(`
    INSERT INTO configuracion 
      (nombre_empresa, nit, email_contacto, telefono_contacto, direccion_fiscal, footer_pdf, logo_url, recomendaciones_generales, version_informe, fecha_modelo_informe, especies_causantes, representante_legal_nombre, representante_legal_cargo, representante_legal_firma_url, vigencia_certificado_meses, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
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
    fecha_modelo_informe,
    JSON.stringify(especies_causantes || ['Palomas', 'Roedores', 'Insectos', 'Aves', 'Murciélagos', 'Avispas', 'Abejas', 'Otros']),
    representante_legal_nombre,
    representante_legal_cargo,
    representante_legal_firma_url,
    vigencia_certificado_meses || 3
  ]);

  return rows[0];
}

export async function updateConfig(id, data) {
  const allowed = [
    'nombre_empresa', 'nit', 'email_contacto', 'telefono_contacto',
    'direccion_fiscal', 'footer_pdf', 'logo_url',
    'recomendaciones_generales', 'version_informe', 'fecha_modelo_informe', 'especies_causantes', 'epp_catalogo',
    'representante_legal_nombre', 'representante_legal_cargo', 'representante_legal_firma_url', 'vigencia_certificado_meses'
  ];

  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx}${(key === 'especies_causantes' || key === 'epp_catalogo') ? '::jsonb' : ''}`);
      values.push((key === 'especies_causantes' || key === 'epp_catalogo') ? JSON.stringify(data[key]) : data[key]);
      idx++;
    }
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const query = `UPDATE configuracion SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  const { rows } = await pool.query(query, values);
  return rows[0];
}
