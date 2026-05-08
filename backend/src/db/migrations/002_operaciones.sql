-- 003: Operaciones (Ordenes, Fotos, Actividades, Estaciones, Productos, Solicitudes, Certificados)
CREATE TABLE IF NOT EXISTS ordenes_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  tecnico_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'terminado')),
  fecha_programada DATE,
  observaciones TEXT,
  recomendaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fotos_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID NOT NULL REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  descripcion TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actividades_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID NOT NULL REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estaciones_usadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID NOT NULL REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  tipo_estacion TEXT,
  cantidad INTEGER DEFAULT 0,
  observaciones TEXT,
  foto_antes_url TEXT,
  foto_despues_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos_usados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID NOT NULL REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  nombre_producto TEXT,
  ingrediente_activo TEXT,
  cantidad TEXT,
  tipo_producto TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solicitudes_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_servicio TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  direccion TEXT,
  fecha_preferida DATE,
  estado TEXT DEFAULT 'pendiente',
  precio_cotizacion NUMERIC,
  descripcion_cotizacion TEXT,
  respuesta_cliente TEXT,
  respuesta_fecha TIMESTAMPTZ,
  motivo_rechazo TEXT,
  cotizacion_leida_por_cliente BOOLEAN DEFAULT FALSE,
  orden_id UUID REFERENCES ordenes_servicio(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID NOT NULL UNIQUE REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  folio VARCHAR(50) UNIQUE NOT NULL,
  firma_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
