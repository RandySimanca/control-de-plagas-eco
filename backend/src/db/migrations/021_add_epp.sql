-- 021: Elementos de Protección Personal (EPP)
-- Agrega catálogo de EPP configurable y registro por orden (mismo patrón que metodos_aplicacion + especies_causantes)

-- Columna para registrar EPP usados por el técnico en la orden (JSONB nativo, default vacío)
ALTER TABLE ordenes_servicio
  ADD COLUMN IF NOT EXISTS epp_utilizado JSONB DEFAULT '[]'::jsonb;

-- Catálogo general de EPP configurable por el admin (mismo patrón que especies_causantes en 016)
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS epp_catalogo JSONB DEFAULT '[
    "Guantes de nitrilo",
    "Guantes de cuero",
    "Botas de seguridad",
    "Gafas protectoras",
    "Monogafas splash",
    "Respirador con filtro químico",
    "Mascarilla N95",
    "Traje Tyvek impermeable",
    "Overol de trabajo",
    "Casco de seguridad",
    "Arnés de seguridad",
    "Protección auditiva",
    "Careta facial"
  ]'::jsonb;
