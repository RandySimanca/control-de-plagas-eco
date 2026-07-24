-- 008: Agregar soporte para es_nueva_instalacion y múltiples fotos en estaciones_usadas

-- 1. Agregar columna es_nueva_instalacion a estaciones_usadas si no existe
ALTER TABLE estaciones_usadas 
ADD COLUMN IF NOT EXISTS es_nueva_instalacion BOOLEAN DEFAULT FALSE;

-- 2. Crear tabla para las fotos de las estaciones usadas
CREATE TABLE IF NOT EXISTS fotos_estaciones_usadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estacion_usada_id UUID NOT NULL REFERENCES estaciones_usadas(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  descripcion TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
