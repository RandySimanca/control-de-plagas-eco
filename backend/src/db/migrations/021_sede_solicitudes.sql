-- 021_sede_solicitudes.sql
-- Add sede_id to solicitudes_servicio

ALTER TABLE solicitudes_servicio
ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES clientes_sedes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_solicitudes_sede ON solicitudes_servicio(sede_id);
