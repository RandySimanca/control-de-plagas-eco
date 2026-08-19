-- Migración: 022_epp_productos.sql
-- Propósito: Agregar categoría 'epp' a productos y tipo de movimiento 'asignacion_tecnico'

-- 1. Modificar restricción de categoría en productos_catalogo
ALTER TABLE productos_catalogo DROP CONSTRAINT IF EXISTS productos_catalogo_categoria_check;
ALTER TABLE productos_catalogo ADD CONSTRAINT productos_catalogo_categoria_check 
  CHECK (categoria IN ('liquido', 'granulado', 'gel', 'trampa', 'equipo', 'epp', 'otro'));

-- 2. Modificar restricción de tipo de referencia en movimientos_stock (el campo es referencia_tipo)
ALTER TABLE movimientos_stock DROP CONSTRAINT IF EXISTS movimientos_stock_referencia_tipo_check;
-- En la migración 014 no le pusieron restricción CHECK estricta a referencia_tipo (solo estaba comentado), 
-- pero el campo `tipo` sí tiene CHECK (entrada, salida, ajuste_manual). 
-- Agregaremos una restricción al campo tipo solo por si acaso, y una a referencia_tipo.
ALTER TABLE movimientos_stock DROP CONSTRAINT IF EXISTS movimientos_stock_tipo_check;
ALTER TABLE movimientos_stock ADD CONSTRAINT movimientos_stock_tipo_check 
  CHECK (tipo IN ('entrada', 'salida', 'ajuste_manual'));

-- En realidad, una asignación a técnico es una "salida" cuyo referencia_tipo es "asignacion_tecnico".
-- Así que no modificamos 'tipo', que siga siendo 'salida'.
