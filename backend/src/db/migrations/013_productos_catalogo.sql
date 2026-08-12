-- Migración: 013_productos_catalogo.sql
-- Propósito: Crear catálogo maestro de productos para estandarizar el uso en las órdenes.

CREATE TABLE IF NOT EXISTS productos_catalogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial VARCHAR(255) NOT NULL,
    ingrediente_activo VARCHAR(255),
    dosis_recomendada VARCHAR(255),
    tipo_producto VARCHAR(100), -- Ej. 'Insecticida', 'Rodenticida', o tipos de plaga
    ficha_seguridad_url TEXT,
    estado VARCHAR(50) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para updated_at
CREATE TRIGGER update_productos_catalogo_updated_at
    BEFORE UPDATE ON productos_catalogo
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Migrar datos existentes (opcional, extraemos los productos únicos usados previamente)
-- Descomentar y ajustar si se desea poblar el catálogo con el histórico
-- INSERT INTO productos_catalogo (nombre_comercial, ingrediente_activo, tipo_producto)
-- SELECT DISTINCT nombre_comercial, MAX(ingrediente_activo), MAX(tipo_producto)
-- FROM productos_usados
-- WHERE nombre_comercial IS NOT NULL AND nombre_comercial != ''
-- GROUP BY nombre_comercial
-- ON CONFLICT DO NOTHING;
