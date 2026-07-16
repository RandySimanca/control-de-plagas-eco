-- 002: Agregar campo municipio a clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS municipio VARCHAR(255);
