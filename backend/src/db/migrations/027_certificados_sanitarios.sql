-- 027_certificados_sanitarios.sql

-- 1. Crear tabla para el nuevo Certificado Sanitario
CREATE TABLE IF NOT EXISTS certificados_sanitarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID NOT NULL REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  folio VARCHAR(50) UNIQUE NOT NULL,
  tipo_establecimiento VARCHAR(100),
  tipo_servicio VARCHAR(255),
  resultado VARCHAR(50) CHECK (resultado IN ('CUMPLE', 'CUMPLE CON OBSERVACIONES', 'NO CUMPLE')),
  observaciones TEXT,
  fecha_servicio TIMESTAMPTZ,
  fecha_emision TIMESTAMPTZ,
  fecha_vencimiento TIMESTAMPTZ,
  normativa_referencia TEXT,
  representante_legal_nombre VARCHAR(100),
  representante_legal_cargo VARCHAR(100),
  firma_representante_url TEXT,
  aprobado BOOLEAN NOT NULL DEFAULT FALSE,
  aprobado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fecha_aprobacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear trigger de actualizacion para certificados_sanitarios
CREATE TRIGGER update_certificados_sanitarios_updated_at BEFORE UPDATE ON certificados_sanitarios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_cert_sanitarios_folio ON certificados_sanitarios(folio);
CREATE INDEX IF NOT EXISTS idx_cert_sanitarios_orden ON certificados_sanitarios(orden_id);
CREATE INDEX IF NOT EXISTS idx_cert_sanitarios_aprobado ON certificados_sanitarios(aprobado);

-- 2. Modificar tabla configuracion para el Representante Legal
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS representante_legal_nombre TEXT,
  ADD COLUMN IF NOT EXISTS representante_legal_cargo TEXT,
  ADD COLUMN IF NOT EXISTS representante_legal_firma_url TEXT,
  ADD COLUMN IF NOT EXISTS vigencia_certificado_meses INTEGER DEFAULT 3;
