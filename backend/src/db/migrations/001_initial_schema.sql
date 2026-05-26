-- 001: Esquema Inicial (Versión Consolidada Completa)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabla para clientes (empresas/ubicaciones)
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  razon_social VARCHAR(255),
  identificacion VARCHAR(50),
  email VARCHAR(255),
  telefono VARCHAR(50),
  direccion TEXT,
  nombre_contacto VARCHAR(255),
  telefono_contacto VARCHAR(50),
  tipo VARCHAR(50) DEFAULT 'residencial',
  notas TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla Consolidada de Usuarios/Perfiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  rol TEXT NOT NULL DEFAULT 'tecnico' CHECK (rol IN ('admin', 'tecnico', 'cliente')),
  especialidad TEXT,
  firma_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tablas de Operaciones
CREATE TABLE IF NOT EXISTS ordenes_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  tecnico_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'terminado', 'programada', 'en_progreso', 'completada')),
  fecha_programada DATE,
  tipo_plaga TEXT,
  observaciones TEXT,
  recomendaciones TEXT,
  areas_intervenidas TEXT,
  metodos_aplicacion TEXT,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Configuración y Legal
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

CREATE TABLE IF NOT EXISTS documentos_legales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_ordenes_updated_at BEFORE UPDATE ON ordenes_servicio FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_actividades_updated_at BEFORE UPDATE ON actividades_servicio FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_solicitudes_updated_at BEFORE UPDATE ON solicitudes_servicio FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_certificados_updated_at BEFORE UPDATE ON certificados FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_configuracion_updated_at BEFORE UPDATE ON configuracion FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
