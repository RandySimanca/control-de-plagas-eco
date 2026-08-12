-- Migración: 014_stock_productos.sql
-- Propósito: Agregar control de inventario al catálogo de productos.
--   - Campos de stock en productos_catalogo (unidad_base, stock_actual, stock_minimo, etc.)
--   - Tabla movimientos_stock para auditoría completa de entradas/salidas
--   - Campos en productos_usados para vincular con el catálogo y registrar cantidad numérica

-- 1. Extender la tabla productos_catalogo con campos de inventario
ALTER TABLE productos_catalogo
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'otro'
    CHECK (categoria IN ('liquido', 'granulado', 'gel', 'trampa', 'equipo', 'otro')),
  ADD COLUMN IF NOT EXISTS unidad_base VARCHAR(20) DEFAULT 'unidad'
    CHECK (unidad_base IN ('ml', 'l', 'g', 'kg', 'unidad')),
  ADD COLUMN IF NOT EXISTS stock_actual NUMERIC(12, 3) DEFAULT 0 CHECK (stock_actual >= 0),
  ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC(12, 3) DEFAULT 0 CHECK (stock_minimo >= 0),
  ADD COLUMN IF NOT EXISTS presentacion_compra VARCHAR(255),
  ADD COLUMN IF NOT EXISTS factor_conversion NUMERIC(12, 3) DEFAULT 1 CHECK (factor_conversion > 0);

-- 2. Tabla de movimientos de inventario (auditoría completa)
CREATE TABLE IF NOT EXISTS movimientos_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos_catalogo(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste_manual')),
  cantidad NUMERIC(12, 3) NOT NULL,                      -- siempre en unidad_base del producto
  cantidad_presentaciones NUMERIC(10, 3),                -- solo para entradas (nro de presentaciones compradas)
  referencia_tipo VARCHAR(50),                           -- 'orden_servicio' | 'reabastecimiento' | 'ajuste_manual'
  referencia_id UUID,                                    -- orden_id u otro ID de referencia
  notas TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_stock_producto ON movimientos_stock (producto_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_referencia ON movimientos_stock (referencia_id);

-- 3. Extender productos_usados para vincular con el catálogo y registrar cantidad numérica
ALTER TABLE productos_usados
  ADD COLUMN IF NOT EXISTS catalogo_id UUID REFERENCES productos_catalogo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cantidad_numerica NUMERIC(12, 3),
  ADD COLUMN IF NOT EXISTS unidad VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_productos_usados_catalogo ON productos_usados (catalogo_id);
