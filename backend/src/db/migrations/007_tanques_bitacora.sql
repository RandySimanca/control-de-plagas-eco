-- 007: Tablas para Fichas Técnicas de Tanques, Bitácora y Fotos asociadas

-- 1. Tabla para la Ficha Técnica del Tanque
CREATE TABLE IF NOT EXISTS tanques_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID NOT NULL REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
  numero VARCHAR(100) NOT NULL,
  nombre VARCHAR(255) DEFAULT 'Tanque Genérico',
  foto_url TEXT,
  tipo_tanque VARCHAR(100),
  material VARCHAR(100),
  capacidad_valor NUMERIC,
  capacidad_unidad VARCHAR(50),
  ubicacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla para la Bitácora de Eventos del Tanque
CREATE TABLE IF NOT EXISTS bitacora_tanques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanque_id UUID NOT NULL REFERENCES tanques_servicio(id) ON DELETE CASCADE,
  tipo_evento VARCHAR(100) NOT NULL, -- Ej: INICIO, HALLAZGO, DURANTE, DESINFECCION, ENJUAGUE, FINAL
  descripcion TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla para las Fotografías de los Eventos
CREATE TABLE IF NOT EXISTS fotos_bitacora_tanques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitacora_id UUID NOT NULL REFERENCES bitacora_tanques(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  descripcion TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers para el campo updated_at
CREATE TRIGGER update_tanques_servicio_updated_at 
BEFORE UPDATE ON tanques_servicio 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_bitacora_tanques_updated_at 
BEFORE UPDATE ON bitacora_tanques 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
