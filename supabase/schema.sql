-- ============================================
-- PlagControl SaaS - Esquema de Base de Datos
-- ============================================

-- 0. Tabla de Empresas SaaS
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  nit TEXT,
  logo_url TEXT,
  estado_licencia TEXT NOT NULL DEFAULT 'activa' CHECK (estado_licencia IN ('activa', 'suspendida', 'vencida')),
  fecha_vencimiento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- (Opcional) Empresa por defecto inicial en ambiente local
INSERT INTO public.empresas (nombre, nit) 
SELECT 'Empresa Inicial (Local)', '000000000'
WHERE NOT EXISTS (SELECT 1 FROM public.empresas);

-- 1. Tabla de perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  rol TEXT NOT NULL DEFAULT 'tecnico' CHECK (rol IN ('superadmin', 'admin', 'tecnico', 'cliente')),
  especialidad TEXT,
  firma_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  cliente_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL DEFAULT public.get_my_empresa_id() REFERENCES public.empresas(id) ON DELETE CASCADE,
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

-- 3. Tabla de órdenes de servicio
CREATE TABLE IF NOT EXISTS public.ordenes_servicio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL DEFAULT public.get_my_empresa_id() REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tecnico_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fecha_programada DATE NOT NULL,
  fecha_completada DATE,
  tipo_plaga TEXT,
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada', 'en_progreso', 'completada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla de productos usados
CREATE TABLE IF NOT EXISTS public.productos_usados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL DEFAULT public.get_my_empresa_id() REFERENCES public.empresas(id) ON DELETE CASCADE,
  orden_id UUID NOT NULL REFERENCES public.ordenes_servicio(id) ON DELETE CASCADE,
  nombre_producto TEXT NOT NULL,
  cantidad TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabla de fotos de servicio
CREATE TABLE IF NOT EXISTS public.fotos_servicio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL DEFAULT public.get_my_empresa_id() REFERENCES public.empresas(id) ON DELETE CASCADE,
  orden_id UUID NOT NULL REFERENCES public.ordenes_servicio(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabla de certificados
CREATE TABLE IF NOT EXISTS public.certificados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL DEFAULT public.get_my_empresa_id() REFERENCES public.empresas(id) ON DELETE CASCADE,
  orden_id UUID NOT NULL REFERENCES public.ordenes_servicio(id) ON DELETE CASCADE,
  folio TEXT NOT NULL UNIQUE,
  pdf_path TEXT,
  firma_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_orden_certificado UNIQUE(orden_id)
);

-- 7. Tabla de actividades (bitácora)
CREATE TABLE IF NOT EXISTS public.actividades_servicio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL DEFAULT public.get_my_empresa_id() REFERENCES public.empresas(id) ON DELETE CASCADE,
  orden_id UUID NOT NULL REFERENCES public.ordenes_servicio(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Tabla de documentos legales
CREATE TABLE IF NOT EXISTS public.documentos_legales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL DEFAULT public.get_my_empresa_id() REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Tabla de configuración (branding)
CREATE TABLE IF NOT EXISTS public.configuracion (
  id SERIAL PRIMARY KEY,
  empresa_id UUID NOT NULL DEFAULT public.get_my_empresa_id() REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre_empresa TEXT NOT NULL DEFAULT 'PlagControl',
  nit TEXT,
  logo_url TEXT,
  email_contacto TEXT,
  telefono_contacto TEXT,
  direccion_fiscal TEXT,
  footer_pdf TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_empresa_config UNIQUE(empresa_id)
);

-- Agregar FK recursiva o complementaria si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_cliente') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_cliente 
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- INDICES PARA DESEMPEÑO SAAS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_empresas_estado ON public.empresas(estado_licencia);
CREATE INDEX IF NOT EXISTS idx_ordenes_cliente ON public.ordenes_servicio(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_tecnico ON public.ordenes_servicio(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON public.ordenes_servicio(estado);

-- Índices de empresa
CREATE INDEX IF NOT EXISTS idx_profiles_empresa ON public.profiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_empresa ON public.ordenes_servicio(empresa_id);
CREATE INDEX IF NOT EXISTS idx_productos_empresa ON public.productos_usados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fotos_empresa ON public.fotos_servicio(empresa_id);
CREATE INDEX IF NOT EXISTS idx_certificados_empresa ON public.certificados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_actividades_empresa ON public.actividades_servicio(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_empresa ON public.documentos_legales(empresa_id);
CREATE INDEX IF NOT EXISTS idx_configuracion_empresa ON public.configuracion(empresa_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos_usados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_legales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- FUNCIONES DE SEGURIDAD (Security Definer) para evitar recursión
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (rol TEXT, empresa_id UUID) AS $$
BEGIN
  RETURN QUERY SELECT p.rol, p.empresa_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.es_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'superadmin' AND activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'admin' AND activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.es_tecnico()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'tecnico' AND activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS UUID AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT p.empresa_id INTO v_empresa_id FROM public.profiles p WHERE p.id = auth.uid();
  RETURN v_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_cliente_id()
RETURNS UUID AS $$
  SELECT cliente_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- POLÍTICAS RLS CON CONTEXTO TENANT
-- ============================================

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Superadmin gestiona empresas" ON public.empresas;
    DROP POLICY IF EXISTS "Usuarios ven su propia empresa" ON public.empresas;
    -- Profiles
    DROP POLICY IF EXISTS "Admin acceso total a profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Lectura perfiles autenticados" ON public.profiles;
    DROP POLICY IF EXISTS "Superadmin total profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admin de empresa total profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Tecnicos y clientes ven profiles de su empresa" ON public.profiles;
    -- Clientes
    DROP POLICY IF EXISTS "Admin acceso total a clientes" ON public.clientes;
    DROP POLICY IF EXISTS "Tecnicos leen clientes" ON public.clientes;
    DROP POLICY IF EXISTS "Clientes ven su propio registro" ON public.clientes;
    DROP POLICY IF EXISTS "Superadmin total clientes" ON public.clientes;
    DROP POLICY IF EXISTS "Admin de empresa total clientes" ON public.clientes;
    DROP POLICY IF EXISTS "Tecnicos leen clientes de su empresa" ON public.clientes;
    -- Ordenes
    DROP POLICY IF EXISTS "Admin acceso total a ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Tecnicos ven todas las ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Clientes ven sus propias ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Superadmin total ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Admin empresa total ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Tecnicos info y read ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Tecnicos actualizan sus ordenes" ON public.ordenes_servicio;
    -- Certificados
    DROP POLICY IF EXISTS "Admin acceso total a certificados" ON public.certificados;
    DROP POLICY IF EXISTS "Lectura certificados autorizada" ON public.certificados;
    DROP POLICY IF EXISTS "Superadmin total certificados" ON public.certificados;
    DROP POLICY IF EXISTS "Admin empresa total certificados" ON public.certificados;
    DROP POLICY IF EXISTS "Tecnicos leen certificados" ON public.certificados;
    DROP POLICY IF EXISTS "Clientes ven certificados" ON public.certificados;
    -- Actividades
    DROP POLICY IF EXISTS "Admin acceso total a actividades" ON public.actividades_servicio;
    DROP POLICY IF EXISTS "Tecnicos ven y crean actividades" ON public.actividades_servicio;
    DROP POLICY IF EXISTS "Clientes ven actividades de sus ordenes" ON public.actividades_servicio;
    DROP POLICY IF EXISTS "Superadmin total actividades" ON public.actividades_servicio;
    DROP POLICY IF EXISTS "Admin empresa total actividades" ON public.actividades_servicio;
    DROP POLICY IF EXISTS "Tecnicos gestionan actividades" ON public.actividades_servicio;
    -- Fotos
    DROP POLICY IF EXISTS "Admin acceso total a fotos" ON public.fotos_servicio;
    DROP POLICY IF EXISTS "Tecnicos gestionan fotos" ON public.fotos_servicio;
    DROP POLICY IF EXISTS "Clientes ven sus fotos de servicio" ON public.fotos_servicio;
    DROP POLICY IF EXISTS "Superadmin total fotos" ON public.fotos_servicio;
    DROP POLICY IF EXISTS "Admin empresa total fotos" ON public.fotos_servicio;
    -- Productos
    DROP POLICY IF EXISTS "Admin acceso total a productos_usados" ON public.productos_usados;
    DROP POLICY IF EXISTS "Tecnicos gestionan productos_usados" ON public.productos_usados;
    DROP POLICY IF EXISTS "Clientes ven sus productos_usados" ON public.productos_usados;
    DROP POLICY IF EXISTS "Superadmin total productos_usados" ON public.productos_usados;
    DROP POLICY IF EXISTS "Admin empresa total productos" ON public.productos_usados;
    DROP POLICY IF EXISTS "Tecnicos gestionan productos" ON public.productos_usados;
    -- Documentos
    DROP POLICY IF EXISTS "Admin acceso total a documentos_legales" ON public.documentos_legales;
    DROP POLICY IF EXISTS "Todos ven documentos_legales" ON public.documentos_legales;
    DROP POLICY IF EXISTS "Superadmin total documentos" ON public.documentos_legales;
    DROP POLICY IF EXISTS "Admin sube documentos empresa" ON public.documentos_legales;
    DROP POLICY IF EXISTS "Todos leen documentos empresa" ON public.documentos_legales;
    -- Configuracion
    DROP POLICY IF EXISTS "Todo el mundo lee la configuración" ON public.configuracion;
    DROP POLICY IF EXISTS "Superadmin total configuracion" ON public.configuracion;
    DROP POLICY IF EXISTS "Admin edita configuracion empresa" ON public.configuracion;
    DROP POLICY IF EXISTS "Todos leen configuracion empresa" ON public.configuracion;
END $$;


-- EMPRESAS
CREATE POLICY "Superadmin gestiona empresas" ON public.empresas FOR ALL USING (public.es_superadmin());
CREATE POLICY "Usuarios ven su propia empresa" ON public.empresas FOR SELECT USING (id = public.get_my_empresa_id());

-- PROFILES
CREATE POLICY "Superadmin total profiles" ON public.profiles FOR ALL USING (public.es_superadmin());
CREATE POLICY "Admin de empresa total profiles" ON public.profiles FOR ALL USING (public.es_admin() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Tecnicos y clientes ven profiles de su empresa" ON public.profiles FOR SELECT USING (empresa_id = public.get_my_empresa_id());

-- CLIENTES
CREATE POLICY "Superadmin total clientes" ON public.clientes FOR ALL USING (public.es_superadmin());
CREATE POLICY "Admin de empresa total clientes" ON public.clientes FOR ALL USING (public.es_admin() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Tecnicos leen clientes de su empresa" ON public.clientes FOR SELECT USING (public.es_tecnico() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Clientes ven su propio registro" ON public.clientes FOR SELECT USING (id = public.get_my_cliente_id());

-- ORDENES
CREATE POLICY "Superadmin total ordenes" ON public.ordenes_servicio FOR ALL USING (public.es_superadmin());
CREATE POLICY "Admin empresa total ordenes" ON public.ordenes_servicio FOR ALL USING (public.es_admin() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Tecnicos info y read ordenes" ON public.ordenes_servicio FOR SELECT USING (public.es_tecnico() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Tecnicos actualizan sus ordenes" ON public.ordenes_servicio FOR UPDATE USING (public.es_tecnico() AND tecnico_id = auth.uid());
CREATE POLICY "Clientes ven sus ordenes" ON public.ordenes_servicio FOR SELECT USING (cliente_id = public.get_my_cliente_id());

-- PRODUCTOS USADOS
CREATE POLICY "Superadmin total productos_usados" ON public.productos_usados FOR ALL USING (public.es_superadmin());
CREATE POLICY "Admin empresa total productos" ON public.productos_usados FOR ALL USING (public.es_admin() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Tecnicos gestionan productos" ON public.productos_usados FOR ALL USING (public.es_tecnico() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Clientes ven productos" ON public.productos_usados FOR SELECT USING (empresa_id = public.get_my_empresa_id() AND orden_id IN (SELECT id FROM public.ordenes_servicio WHERE cliente_id = public.get_my_cliente_id()));

-- FOTOS SERVICIO
CREATE POLICY "Superadmin total fotos" ON public.fotos_servicio FOR ALL USING (public.es_superadmin());
CREATE POLICY "Admin empresa total fotos" ON public.fotos_servicio FOR ALL USING (public.es_admin() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Tecnicos gestionan fotos" ON public.fotos_servicio FOR ALL USING (public.es_tecnico() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Clientes ven fotos" ON public.fotos_servicio FOR SELECT USING (empresa_id = public.get_my_empresa_id() AND orden_id IN (SELECT id FROM public.ordenes_servicio WHERE cliente_id = public.get_my_cliente_id()));

-- CERTIFICADOS
CREATE POLICY "Superadmin total certificados" ON public.certificados FOR ALL USING (public.es_superadmin());
CREATE POLICY "Admin empresa total certificados" ON public.certificados FOR ALL USING (public.es_admin() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Tecnicos leen certificados" ON public.certificados FOR SELECT USING (public.es_tecnico() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Clientes ven certificados" ON public.certificados FOR SELECT USING (empresa_id = public.get_my_empresa_id() AND orden_id IN (SELECT id FROM public.ordenes_servicio WHERE cliente_id = public.get_my_cliente_id()));

-- ACTIVIDADES SERVICIO
CREATE POLICY "Superadmin total actividades" ON public.actividades_servicio FOR ALL USING (public.es_superadmin());
CREATE POLICY "Admin empresa total actividades" ON public.actividades_servicio FOR ALL USING (public.es_admin() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Tecnicos gestionan actividades" ON public.actividades_servicio FOR ALL USING (public.es_tecnico() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Clientes ven actividades" ON public.actividades_servicio FOR SELECT USING (empresa_id = public.get_my_empresa_id() AND orden_id IN (SELECT id FROM public.ordenes_servicio WHERE cliente_id = public.get_my_cliente_id()));

-- DOCUMENTOS LEGALES
CREATE POLICY "Superadmin total documentos" ON public.documentos_legales FOR ALL USING (public.es_superadmin());
CREATE POLICY "Admin sube documentos empresa" ON public.documentos_legales FOR ALL USING (public.es_admin() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Todos leen documentos empresa" ON public.documentos_legales FOR SELECT USING (empresa_id = public.get_my_empresa_id());

-- CONFIGURACION
CREATE POLICY "Superadmin total configuracion" ON public.configuracion FOR ALL USING (public.es_superadmin());
CREATE POLICY "Admin edita configuracion empresa" ON public.configuracion FOR ALL USING (public.es_admin() AND empresa_id = public.get_my_empresa_id());
CREATE POLICY "Todos leen configuracion empresa" ON public.configuracion FOR SELECT USING (empresa_id = public.get_my_empresa_id());

-- ============================================
-- STORAGE BUCKETS SETUP
-- ============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('fotos-servicio', 'fotos-servicio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================
-- STORAGE POLICIES
-- ============================================

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Acceso público a fotos" ON storage.objects;
    DROP POLICY IF EXISTS "Usuarios autenticados suben fotos" ON storage.objects;
    DROP POLICY IF EXISTS "Acceso público a documentos" ON storage.objects;
    DROP POLICY IF EXISTS "Admin sube documentos" ON storage.objects;
    DROP POLICY IF EXISTS "Admin borra documentos" ON storage.objects;
END $$;

-- Fotos
CREATE POLICY "Acceso público a fotos" ON storage.objects FOR SELECT USING (bucket_id = 'fotos-servicio');
CREATE POLICY "Usuarios autenticados suben fotos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'fotos-servicio' AND (public.es_superadmin() OR public.es_admin() OR public.es_tecnico())
);

-- Documentos Legales
CREATE POLICY "Acceso público a documentos" ON storage.objects FOR SELECT USING (bucket_id = 'documentos');
CREATE POLICY "Admin sube documentos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documentos' AND (public.es_superadmin() OR public.es_admin())
);
CREATE POLICY "Admin borra documentos" ON storage.objects FOR DELETE USING (
  bucket_id = 'documentos' AND (public.es_superadmin() OR public.es_admin())
);

-- ============================================
-- TRIGGER: Auto-crear perfil al registrar usuario
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  v_empresa_id := NULLIF(NEW.raw_user_meta_data->>'empresa_id', '')::UUID;
  
  IF v_empresa_id IS NULL THEN
    SELECT id INTO v_empresa_id FROM public.empresas LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, nombre_completo, rol, email, empresa_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'tecnico'),
    NEW.email,
    v_empresa_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
