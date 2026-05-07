-- =====================================================
-- PlagControl - Esquema Single-Tenant (sin Supabase)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- TABLAS BASE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES public.usuarios_auth(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  rol TEXT NOT NULL DEFAULT 'tecnico' CHECK (rol IN ('admin', 'tecnico', 'cliente')),
  especialidad TEXT,
  firma_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  cliente_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  razon_social TEXT,
  identificacion TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  nombre_contacto TEXT,
  telefono_contacto TEXT,
  tipo TEXT NOT NULL DEFAULT 'residencial' CHECK (tipo IN ('residencial', 'industrial', 'comercial')),
  notas TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS fk_profiles_cliente;

ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_cliente
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.ordenes_servicio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tecnico_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  solicitud_id UUID,
  fecha_programada DATE NOT NULL,
  fecha_completada DATE,
  tipo_plaga TEXT,
  observaciones TEXT,
  recomendaciones TEXT,
  areas_intervenidas TEXT,
  metodos_aplicados TEXT,
  estado TEXT NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada', 'en_progreso', 'completada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.productos_usados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orden_id UUID NOT NULL REFERENCES public.ordenes_servicio(id) ON DELETE CASCADE,
  nombre_producto TEXT NOT NULL,
  nombre_comercial TEXT,
  tipo_producto TEXT,
  ingrediente_activo TEXT,
  cantidad TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.estaciones_usadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orden_id UUID NOT NULL REFERENCES public.ordenes_servicio(id) ON DELETE CASCADE,
  tipo_estacion TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 0,
  observaciones TEXT,
  foto_antes_url TEXT,
  foto_despues_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fotos_servicio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orden_id UUID NOT NULL REFERENCES public.ordenes_servicio(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.certificados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orden_id UUID NOT NULL REFERENCES public.ordenes_servicio(id) ON DELETE CASCADE,
  folio TEXT NOT NULL UNIQUE,
  pdf_path TEXT,
  firma_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_orden_certificado UNIQUE (orden_id)
);

CREATE TABLE IF NOT EXISTS public.actividades_servicio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orden_id UUID NOT NULL REFERENCES public.ordenes_servicio(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documentos_legales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.configuracion (
  id SERIAL PRIMARY KEY,
  nombre_empresa TEXT NOT NULL DEFAULT 'PlagControl',
  nit TEXT,
  logo_url TEXT,
  email_contacto TEXT,
  telefono_contacto TEXT,
  direccion_fiscal TEXT,
  footer_pdf TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.solicitudes_servicio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo_servicio TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  direccion TEXT,
  fecha_preferida DATE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'cotizada', 'aceptada', 'rechazada', 'convertida')),
  cotizacion_precio NUMERIC(12,2),
  cotizacion_descripcion TEXT,
  cotizacion_fecha TIMESTAMPTZ,
  cotizacion_leida_por_cliente BOOLEAN NOT NULL DEFAULT false,
  orden_id UUID REFERENCES public.ordenes_servicio(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ordenes_servicio
  DROP CONSTRAINT IF EXISTS fk_ordenes_solicitud;

ALTER TABLE public.ordenes_servicio
  ADD CONSTRAINT fk_ordenes_solicitud
  FOREIGN KEY (solicitud_id) REFERENCES public.solicitudes_servicio(id) ON DELETE SET NULL;

-- =====================================================
-- INDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_rol ON public.profiles(rol);
CREATE INDEX IF NOT EXISTS idx_profiles_cliente ON public.profiles(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON public.clientes(activo);
CREATE INDEX IF NOT EXISTS idx_ordenes_cliente ON public.ordenes_servicio(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_tecnico ON public.ordenes_servicio(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON public.ordenes_servicio(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_solicitud ON public.ordenes_servicio(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_productos_orden ON public.productos_usados(orden_id);
CREATE INDEX IF NOT EXISTS idx_estaciones_orden ON public.estaciones_usadas(orden_id);
CREATE INDEX IF NOT EXISTS idx_fotos_orden ON public.fotos_servicio(orden_id);
CREATE INDEX IF NOT EXISTS idx_certificados_orden ON public.certificados(orden_id);
CREATE INDEX IF NOT EXISTS idx_actividades_orden ON public.actividades_servicio(orden_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_cliente ON public.solicitudes_servicio(cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON public.solicitudes_servicio(estado);

-- =====================================================
-- DATOS INICIALES MINIMOS
-- =====================================================

INSERT INTO public.configuracion (id, nombre_empresa)
SELECT 1, 'PlagControl'
WHERE NOT EXISTS (SELECT 1 FROM public.configuracion WHERE id = 1);
