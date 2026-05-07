import { pool } from '../../config/database.js';

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documentos_legales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre TEXT NOT NULL,
      url TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function listDocumentos() {
  await ensureTable();
  const { rows } = await pool.query(
    'SELECT * FROM documentos_legales ORDER BY created_at DESC'
  );
  return rows;
}

export async function createDocumento(data) {
  await ensureTable();
  const { nombre, url, storage_path } = data;
  const { rows } = await pool.query(
    'INSERT INTO documentos_legales (nombre, url, storage_path, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
    [nombre, url, storage_path]
  );
  return rows[0];
}

export async function deleteDocumento(id) {
  await ensureTable();
  const { rows } = await pool.query(
    'SELECT storage_path FROM documentos_legales WHERE id = $1',
    [id]
  );
  return rows[0];
}
