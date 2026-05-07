import { pool } from '../../config/database.js';

async function ensureConfigTable() {
  // Create table if it doesn't exist with all necessary columns
  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracion (
      id SERIAL PRIMARY KEY,
      nombre_empresa TEXT NOT NULL DEFAULT 'PlagControl',
      nit TEXT,
      logo_url TEXT,
      email_contacto TEXT,
      telefono_contacto TEXT,
      direccion_fiscal TEXT,
      footer_pdf TEXT,
      recomendaciones_generales TEXT,
      version_informe TEXT,
      fecha_modelo_informe TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Add missing columns if table already exists without them
  const missingColumns = [
    { name: 'recomendaciones_generales', type: 'TEXT' },
    { name: 'version_informe', type: 'TEXT' },
    { name: 'fecha_modelo_informe', type: 'TEXT' }
  ];

  for (const col of missingColumns) {
    const { rows } = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'configuracion' AND column_name = $1",
      [col.name]
    );
    if (rows.length === 0) {
      await pool.query(`ALTER TABLE configuracion ADD COLUMN ${col.name} ${col.type}`);
    }
  }
}

export async function getConfig() {
  await ensureConfigTable();
  const { rows } = await pool.query('SELECT * FROM configuracion LIMIT 1');
  return rows[0] || null;
}

export async function createConfig(data) {
  await ensureConfigTable();
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
  await ensureConfigTable();
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
