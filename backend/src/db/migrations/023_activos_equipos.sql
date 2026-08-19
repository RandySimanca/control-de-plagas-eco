-- 023_activos_equipos.sql
CREATE TABLE IF NOT EXISTS equipos_activos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos_catalogo(id) ON DELETE CASCADE,
  codigo_activo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  numero_serie VARCHAR(100),
  estado VARCHAR(20) NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'prestado', 'reparacion', 'baja', 'perdido')),
  tecnico_actual_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ultima_fecha_prestamo TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historial_prestamos_equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id UUID NOT NULL REFERENCES equipos_activos(id) ON DELETE CASCADE,
  tecnico_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('salida', 'entrada', 'mantenimiento')),
  notas TEXT,
  registrado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_equipos_activos_updated_at BEFORE UPDATE ON equipos_activos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
