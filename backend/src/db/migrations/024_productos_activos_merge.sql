-- 024_productos_activos_merge.sql

-- 1. Eliminar tablas anteriores de equipos_activos
DROP TABLE IF EXISTS historial_prestamos_equipos CASCADE;
DROP TABLE IF EXISTS equipos_activos CASCADE;

-- 2. Modificar productos_catalogo para incluir los campos de activos
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS codigo_activo VARCHAR(50);
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS marca VARCHAR(100);
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS modelo VARCHAR(100);
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS numero_serie VARCHAR(100);
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS estado_fisico VARCHAR(20) DEFAULT 'disponible' CHECK (estado_fisico IN ('disponible', 'reparacion', 'baja', 'perdido'));
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS estado_prestamo VARCHAR(20) DEFAULT 'en_bodega' CHECK (estado_prestamo IN ('en_bodega', 'prestado'));
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS tecnico_actual_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS ultima_fecha_prestamo TIMESTAMPTZ;

-- 3. Crear nueva tabla de historial referenciando directamente a productos_catalogo
CREATE TABLE IF NOT EXISTS historial_prestamos_equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos_catalogo(id) ON DELETE CASCADE,
  tecnico_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('salida', 'entrada', 'mantenimiento')),
  notas TEXT,
  registrado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
