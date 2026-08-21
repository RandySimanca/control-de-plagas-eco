-- Migración: 025_inventario_tecnicos.sql
-- Propósito: Tabla para inventario móvil (auto-servicio) de los técnicos.

-- 1. Crear tabla tecnicos_inventario
CREATE TABLE IF NOT EXISTS tecnicos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  catalogo_id UUID NOT NULL REFERENCES productos_catalogo(id) ON DELETE RESTRICT,
  lote VARCHAR(100),
  cantidad_sacada NUMERIC(12, 3) NOT NULL DEFAULT 0,
  cantidad_usada NUMERIC(12, 3) NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'en_poder' CHECK (estado IN ('en_poder', 'devuelto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tecnicos_inventario_tecnico ON tecnicos_inventario(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_tecnicos_inventario_catalogo ON tecnicos_inventario(catalogo_id);

-- 2. Modificar tabla movimientos_stock para incluir lote
ALTER TABLE movimientos_stock
  ADD COLUMN IF NOT EXISTS lote VARCHAR(100);

-- 3. Modificar tabla productos_usados para incluir lote y referencia al inventario
ALTER TABLE productos_usados
  ADD COLUMN IF NOT EXISTS lote VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tecnico_inventario_id UUID REFERENCES tecnicos_inventario(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_productos_usados_tecnico_inv ON productos_usados(tecnico_inventario_id);
