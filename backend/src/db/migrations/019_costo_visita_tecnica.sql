-- 019: Costo de visita técnica y descuento en cotización

ALTER TABLE ordenes_servicio
  ADD COLUMN IF NOT EXISTS costo_visita_tecnica NUMERIC DEFAULT NULL;

ALTER TABLE solicitudes_servicio
  ADD COLUMN IF NOT EXISTS costo_visita_tecnica NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS precio_servicio_bruto NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS descuento_visita_tecnica NUMERIC DEFAULT NULL;
