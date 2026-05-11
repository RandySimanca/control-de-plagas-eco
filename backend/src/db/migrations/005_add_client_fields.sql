-- 005: Add missing fields to clientes table
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS razon_social VARCHAR(255),
ADD COLUMN IF NOT EXISTS identificacion VARCHAR(50),
ADD COLUMN IF NOT EXISTS nombre_contacto VARCHAR(255),
ADD COLUMN IF NOT EXISTS telefono_contacto VARCHAR(50),
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'residencial';
