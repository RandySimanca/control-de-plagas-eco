-- 017: Aprobación de informes técnicos de visita técnica (mismo flujo que certificados)

ALTER TABLE relevamientos
  ADD COLUMN IF NOT EXISTS folio VARCHAR(50),
  ADD COLUMN IF NOT EXISTS aprobado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aprobado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS informe_generado_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_relevamientos_aprobado ON relevamientos(aprobado);
CREATE INDEX IF NOT EXISTS idx_relevamientos_informe_generado ON relevamientos(informe_generado_at);
