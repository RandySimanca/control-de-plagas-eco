-- 015_sedes_cliente.sql

CREATE TABLE IF NOT EXISTS clientes_sedes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT,
    municipio VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_clientes_sedes_updated_at
    BEFORE UPDATE ON clientes_sedes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add sede_id to ordenes_servicio
ALTER TABLE ordenes_servicio 
ADD COLUMN sede_id UUID REFERENCES clientes_sedes(id) ON DELETE SET NULL;

-- Add sede_id to estaciones
ALTER TABLE estaciones 
ADD COLUMN sede_id UUID REFERENCES clientes_sedes(id) ON DELETE SET NULL;
