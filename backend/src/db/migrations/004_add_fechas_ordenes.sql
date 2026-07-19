-- 004: Agregar columnas fecha_inicio y fecha_completada a ordenes_servicio
ALTER TABLE ordenes_servicio ADD COLUMN IF NOT EXISTS fecha_inicio TIMESTAMPTZ;
ALTER TABLE ordenes_servicio ADD COLUMN IF NOT EXISTS fecha_completada TIMESTAMPTZ;
