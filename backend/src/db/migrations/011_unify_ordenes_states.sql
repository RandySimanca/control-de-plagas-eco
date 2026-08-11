-- 011: Unificar estados de ordenes_servicio

-- 1. Actualizar los datos existentes
UPDATE ordenes_servicio SET estado = 'programada' WHERE estado = 'pendiente';
UPDATE ordenes_servicio SET estado = 'en_progreso' WHERE estado = 'en_proceso';
UPDATE ordenes_servicio SET estado = 'completada' WHERE estado = 'terminado';

-- 2. Cambiar el valor por defecto
ALTER TABLE ordenes_servicio ALTER COLUMN estado SET DEFAULT 'programada';

-- 3. Actualizar el constraint
-- Usamos un bloque anónimo para encontrar y borrar el constraint actual
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'ordenes_servicio'::regclass
      AND contype = 'c'
      AND conkey = (SELECT array_agg(attnum) FROM pg_attribute WHERE attrelid = 'ordenes_servicio'::regclass AND attname = 'estado');
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE ordenes_servicio DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- 4. Agregar el nuevo constraint con los estados permitidos
ALTER TABLE ordenes_servicio ADD CONSTRAINT ordenes_servicio_estado_check CHECK (estado IN ('programada', 'en_progreso', 'completada', 'cancelada'));
