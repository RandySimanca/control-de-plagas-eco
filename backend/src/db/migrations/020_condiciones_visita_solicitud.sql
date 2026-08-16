-- 020: Condiciones de visita técnica y flujo de aceptaciones en solicitudes

ALTER TABLE solicitudes_servicio
  ADD COLUMN IF NOT EXISTS condiciones_visita TEXT,
  ADD COLUMN IF NOT EXISTS condiciones_visita_enviadas_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS aceptacion_condiciones TEXT,
  ADD COLUMN IF NOT EXISTS aceptacion_condiciones_fecha TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS informe_disponible_at TIMESTAMPTZ;
