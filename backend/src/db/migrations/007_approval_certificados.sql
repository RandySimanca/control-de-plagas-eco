-- Migración 007: Aprobación y verificación de certificados por el Administrador

ALTER TABLE certificados
  ADD COLUMN IF NOT EXISTS aprobado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aprobado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMPTZ;

-- Marcar certificados preexistentes como aprobados para mantener compatibilidad histórica
UPDATE certificados SET aprobado = true WHERE fecha_aprobacion IS NULL AND aprobado IS FALSE;

CREATE INDEX IF NOT EXISTS idx_certificados_aprobado ON certificados(aprobado);
