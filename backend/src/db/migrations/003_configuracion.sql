-- 004: Configuracion
CREATE TABLE IF NOT EXISTS configuracion (
  id SERIAL PRIMARY KEY,
  nombre_empresa TEXT NOT NULL DEFAULT 'PlagControl',
  nit TEXT,
  logo_url TEXT,
  email_contacto TEXT,
  telefono_contacto TEXT,
  direccion_fiscal TEXT,
  footer_pdf TEXT,
  recomendaciones_generales TEXT,
  version_informe TEXT,
  fecha_modelo_informe TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
