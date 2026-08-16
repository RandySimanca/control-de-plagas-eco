-- 018: Vincular solicitudes con visitas técnicas y trazabilidad a orden de servicio

ALTER TABLE solicitudes_servicio
  ADD COLUMN IF NOT EXISTS orden_visita_id UUID REFERENCES ordenes_servicio(id) ON DELETE SET NULL;

ALTER TABLE ordenes_servicio
  ADD COLUMN IF NOT EXISTS orden_visita_origen_id UUID REFERENCES ordenes_servicio(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_solicitudes_orden_visita ON solicitudes_servicio(orden_visita_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_visita_origen ON ordenes_servicio(orden_visita_origen_id);
