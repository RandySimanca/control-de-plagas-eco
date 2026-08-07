import { pool } from '../../config/database.js';

export async function listDocumentos() {
  const { rows } = await pool.query(
    'SELECT * FROM documentos_legales ORDER BY created_at DESC'
  );
  return rows;
}

export async function createDocumento(data) {
  const { nombre, url, storage_path } = data;
  const { rows } = await pool.query(
    'INSERT INTO documentos_legales (nombre, url, storage_path, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
    [nombre, url, storage_path]
  );
  return rows[0];
}

export async function deleteDocumento(id) {
  // Primero obtenemos el registro para recuperar el storage_path
  const { rows } = await pool.query(
    'SELECT storage_path FROM documentos_legales WHERE id = $1',
    [id]
  );
  if (!rows[0]) return null;

  // Luego eliminamos el registro de la base de datos
  await pool.query(
    'DELETE FROM documentos_legales WHERE id = $1',
    [id]
  );

  return rows[0];
}
