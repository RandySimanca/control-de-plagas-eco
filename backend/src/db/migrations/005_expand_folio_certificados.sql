-- Migración 005: Ampliar columna folio de certificados al nuevo formato
-- Nuevo formato: PREFIJO-YYYYMMDD-HHMMSS (ej: PC-20260719-154259)
-- La columna VARCHAR(50) es suficiente pero la expandimos para mayor seguridad.

ALTER TABLE certificados
  ALTER COLUMN folio TYPE VARCHAR(30);

-- Añadir índice para búsquedas rápidas por folio (ya tiene UNIQUE pero el índice explícito mejora el EXPLAIN)
CREATE INDEX IF NOT EXISTS idx_certificados_folio ON certificados(folio);
