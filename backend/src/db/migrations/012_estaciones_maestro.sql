-- 012: Tabla maestra de estaciones con trazabilidad

CREATE TABLE IF NOT EXISTS estaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL,
  ubicacion TEXT,
  codigo_qr TEXT UNIQUE,
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'inactiva', 'retirada')),
  fecha_instalacion TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cliente_id, tipo, numero)
);

-- Actualizar timestamp
CREATE TRIGGER update_estaciones_updated_at BEFORE UPDATE ON estaciones FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Modificar tabla de monitoreo para enlazarse a la estación individual
ALTER TABLE estaciones_usadas ADD COLUMN IF NOT EXISTS estacion_id UUID REFERENCES estaciones(id) ON DELETE CASCADE;

-- Migración de datos: Crear el maestro de estaciones a partir del historial máximo de cada cliente
DO $$
DECLARE
    rec RECORD;
    i INT;
BEGIN
    FOR rec IN (
        SELECT 
            c.id AS cliente_id,
            eu.tipo_estacion AS tipo,
            MAX(eu.cantidad) AS max_cantidad,
            MIN(COALESCE(o.fecha_programada, o.created_at)) AS primera_fecha
        FROM estaciones_usadas eu
        JOIN ordenes_servicio o ON o.id = eu.orden_id
        JOIN clientes c ON c.id = o.cliente_id
        GROUP BY c.id, eu.tipo_estacion
    ) LOOP
        -- Insertar tantas estaciones como el máximo histórico reportado para ese cliente
        FOR i IN 1..rec.max_cantidad LOOP
            INSERT INTO estaciones (cliente_id, numero, tipo, estado, fecha_instalacion)
            VALUES (rec.cliente_id, i::TEXT, rec.tipo, 'activa', rec.primera_fecha)
            ON CONFLICT (cliente_id, tipo, numero) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
