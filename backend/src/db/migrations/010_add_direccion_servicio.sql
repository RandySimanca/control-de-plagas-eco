-- 010: Agregar columna direccion_servicio a ordenes_servicio
-- Almacena la dirección específica del servicio (puede diferir de la dirección registrada del cliente)
ALTER TABLE ordenes_servicio ADD COLUMN IF NOT EXISTS direccion_servicio TEXT;
