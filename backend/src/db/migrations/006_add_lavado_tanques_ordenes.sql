-- 006: Añadir campo lavado_tanques a ordenes_servicio
ALTER TABLE ordenes_servicio
  ADD COLUMN IF NOT EXISTS lavado_tanques BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lavado_tanques_cantidad INTEGER DEFAULT 0;
