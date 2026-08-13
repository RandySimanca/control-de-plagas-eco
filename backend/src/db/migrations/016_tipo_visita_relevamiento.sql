-- 016: Tipo de visita, relevamientos técnicos y especies configurables

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE ordenes_servicio
  ADD COLUMN IF NOT EXISTS tipo_visita VARCHAR(20) NOT NULL DEFAULT 'servicio'
    CHECK (tipo_visita IN ('tecnica', 'servicio', 'mantenimiento'));

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS especies_causantes JSONB DEFAULT '["Palomas","Roedores","Insectos","Aves","Murciélagos","Otros"]'::jsonb;

CREATE TABLE IF NOT EXISTS relevamientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID NOT NULL UNIQUE REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'completo')),
  especies JSONB DEFAULT '[]'::jsonb,
  ubicacion TEXT,
  area_afectada_valor NUMERIC,
  area_afectada_unidad VARCHAR(20) DEFAULT 'm²',
  altura_estructura TEXT,
  puntos_acceso JSONB DEFAULT '[]'::jsonb,
  lugares_anidamiento JSONB DEFAULT '[]'::jsonb,
  nivel_acumulacion VARCHAR(20),
  riesgos TEXT,
  sistema_control_recomendado TEXT,
  materiales_estimados JSONB DEFAULT '[]'::jsonb,
  diagnostico TEXT,
  solucion_propuesta TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fotos_relevamiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relevamiento_id UUID NOT NULL REFERENCES relevamientos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  descripcion TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_relevamientos_updated_at
  BEFORE UPDATE ON relevamientos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();