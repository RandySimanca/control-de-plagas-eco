-- 028_sede_planos.sql
-- Planos/croquis por sede y posición relativa de estaciones sobre el plano.

CREATE TABLE IF NOT EXISTS sede_planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  sede_id UUID REFERENCES clientes_sedes(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  origen TEXT NOT NULL DEFAULT 'plano'
    CHECK (origen IN ('plano','foto_croquis','croquis_app')),
  imagen_url TEXT NOT NULL,
  storage_path TEXT,
  ancho INT,
  alto INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_sede_planos_updated_at ON sede_planos;
CREATE TRIGGER update_sede_planos_updated_at
  BEFORE UPDATE ON sede_planos
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE estaciones
  ADD COLUMN IF NOT EXISTS plano_id UUID REFERENCES sede_planos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pos_x NUMERIC,
  ADD COLUMN IF NOT EXISTS pos_y NUMERIC;

ALTER TABLE estaciones DROP CONSTRAINT IF EXISTS estaciones_pos_xy_rango;
ALTER TABLE estaciones
  ADD CONSTRAINT estaciones_pos_xy_rango
  CHECK (
    (pos_x IS NULL OR (pos_x >= 0 AND pos_x <= 1))
    AND (pos_y IS NULL OR (pos_y >= 0 AND pos_y <= 1))
  );

ALTER TABLE estaciones DROP CONSTRAINT IF EXISTS estaciones_plano_posicion_coherente;
ALTER TABLE estaciones
  ADD CONSTRAINT estaciones_plano_posicion_coherente
  CHECK (
    plano_id IS NOT NULL
    OR (pos_x IS NULL AND pos_y IS NULL)
  );
