-- 026_lote_catalogo.sql
-- Propósito: Agregar campo lote/número de lote a productos_catalogo para trazabilidad

ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS lote VARCHAR(100);
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
