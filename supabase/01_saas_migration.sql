-- ============================================
-- MIGRACIÓN A MODELO SAAS MULTI-EMPRESA
-- ============================================

-- 1. Crear tabla de empresas
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

-- Habilitar RLS en empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 2. Insertar una "Empresa Inicial" para poder migrar los datos actuales
INSERT INTO public.empresas (nombre, nit) 
SELECT 'Empresa Inicial (Migración)', '000000000'
WHERE NOT EXISTS (SELECT 1 FROM public.empresas LIMIT 1);

-- 3. Bloque para añadir la columna empresa_id a todas las tablas y migrar datos
DO $$ 
DECLARE 
  v_empresa_id UUID;
BEGIN
  SELECT id INTO v_empresa_id FROM public.empresas LIMIT 1;

  -- 3.1 profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='empresa_id') THEN
    ALTER TABLE public.profiles ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
    UPDATE public.profiles SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    -- Los superadmins podrían tener empresa_id nulo, pero por ahora pongamos a todos en la inicial (se cambia manual luego)
  END IF;

  -- Además vamos a agregar el rol 'superadmin' al CHECK de roles (reemplazando el check)
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_rol_check CHECK (rol IN ('superadmin', 'admin', 'tecnico', 'cliente'));

  -- 3.2 clientes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='empresa_id') THEN
    ALTER TABLE public.clientes ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
    UPDATE public.clientes SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.clientes ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- 3.3 ordenes_servicio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ordenes_servicio' AND column_name='empresa_id') THEN
    ALTER TABLE public.ordenes_servicio ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
    UPDATE public.ordenes_servicio SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.ordenes_servicio ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- 3.4 productos_usados
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos_usados' AND column_name='empresa_id') THEN
    ALTER TABLE public.productos_usados ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
    UPDATE public.productos_usados SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.productos_usados ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- 3.5 fotos_servicio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fotos_servicio' AND column_name='empresa_id') THEN
    ALTER TABLE public.fotos_servicio ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
    UPDATE public.fotos_servicio SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.fotos_servicio ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- 3.6 certificados
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certificados' AND column_name='empresa_id') THEN
    ALTER TABLE public.certificados ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
    UPDATE public.certificados SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.certificados ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- 3.7 actividades_servicio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades_servicio' AND column_name='empresa_id') THEN
    ALTER TABLE public.actividades_servicio ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
    UPDATE public.actividades_servicio SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.actividades_servicio ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- 3.8 documentos_legales
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documentos_legales' AND column_name='empresa_id') THEN
    ALTER TABLE public.documentos_legales ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
    UPDATE public.documentos_legales SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.documentos_legales ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- 3.9 configuracion
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='configuracion' AND column_name='empresa_id') THEN
    ALTER TABLE public.configuracion DROP CONSTRAINT IF EXISTS one_row;
    ALTER TABLE public.configuracion ADD COLUMN empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
    UPDATE public.configuracion SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.configuracion ALTER COLUMN empresa_id SET NOT NULL;
    ALTER TABLE public.configuracion ADD CONSTRAINT unique_empresa_config UNIQUE(empresa_id);
  END IF;

END $$;

-- ============================================
-- INDICES PARA OPTIMIZAR QUERIES MULTI-TENANT
-- ============================================
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
-- NUEVAS FUNCIONES DE SEGURIDAD (RLS)
-- ============================================

-- Obtenemos el perfil actual completo para no hacer multiples queries
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (rol TEXT, empresa_id UUID) AS $$
BEGIN
  RETURN QUERY SELECT p.rol, p.empresa_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcion simplificada para ver si soy superadmin
CREATE OR REPLACE FUNCTION public.es_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'superadmin' AND activo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcion para obtener la empresa ID actual
CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS UUID AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id FROM public.profiles WHERE id = auth.uid();
  RETURN v_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reemplazamos handle_new_user para que sea consciente de empresa_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  -- Intentamos sacar empresa_id de metadata, o usar el default de la empresa inicial si no existe
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


-- ============================================
-- APLICAR DEFAULTS DEPENDIENTES DE FUNCIONES
-- ============================================
ALTER TABLE public.clientes ALTER COLUMN empresa_id SET DEFAULT public.get_my_empresa_id();
ALTER TABLE public.ordenes_servicio ALTER COLUMN empresa_id SET DEFAULT public.get_my_empresa_id();
ALTER TABLE public.productos_usados ALTER COLUMN empresa_id SET DEFAULT public.get_my_empresa_id();
ALTER TABLE public.fotos_servicio ALTER COLUMN empresa_id SET DEFAULT public.get_my_empresa_id();
ALTER TABLE public.certificados ALTER COLUMN empresa_id SET DEFAULT public.get_my_empresa_id();
ALTER TABLE public.actividades_servicio ALTER COLUMN empresa_id SET DEFAULT public.get_my_empresa_id();
ALTER TABLE public.documentos_legales ALTER COLUMN empresa_id SET DEFAULT public.get_my_empresa_id();
ALTER TABLE public.configuracion ALTER COLUMN empresa_id SET DEFAULT public.get_my_empresa_id();


-- ============================================
-- RE-CREAR POLÍTICAS RLS CON CONTEXTO TENANT
-- ============================================

DO $$ 
BEGIN
    -- Borrar TODAS las viejas politicas para renovarlas
    -- Profiles
    DROP POLICY IF EXISTS "Admin acceso total a profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Lectura perfiles autenticados" ON public.profiles;
    -- Clientes
    DROP POLICY IF EXISTS "Admin acceso total a clientes" ON public.clientes;
    DROP POLICY IF EXISTS "Tecnicos leen clientes" ON public.clientes;
    DROP POLICY IF EXISTS "Clientes ven su propio registro" ON public.clientes;
    -- Ordenes
    DROP POLICY IF EXISTS "Admin acceso total a ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Tecnicos ven todas las ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Clientes ven sus propias ordenes" ON public.ordenes_servicio;
    -- Certificados
    DROP POLICY IF EXISTS "Admin acceso total a certificados" ON public.certificados;
    DROP POLICY IF EXISTS "Lectura certificados autorizada" ON public.certificados;
    -- Actividades
    DROP POLICY IF EXISTS "Admin acceso total a actividades" ON public.actividades_servicio;
    DROP POLICY IF EXISTS "Tecnicos ven y crean actividades" ON public.actividades_servicio;
    DROP POLICY IF EXISTS "Clientes ven actividades de sus ordenes" ON public.actividades_servicio;
    -- Fotos
    DROP POLICY IF EXISTS "Admin acceso total a fotos" ON public.fotos_servicio;
    DROP POLICY IF EXISTS "Tecnicos gestionan fotos" ON public.fotos_servicio;
    DROP POLICY IF EXISTS "Clientes ven sus fotos de servicio" ON public.fotos_servicio;
    -- Productos
    DROP POLICY IF EXISTS "Admin acceso total a productos_usados" ON public.productos_usados;
    DROP POLICY IF EXISTS "Tecnicos gestionan productos_usados" ON public.productos_usados;
    DROP POLICY IF EXISTS "Clientes ven sus productos_usados" ON public.productos_usados;
    -- Documentos
    DROP POLICY IF EXISTS "Admin acceso total a documentos_legales" ON public.documentos_legales;
    DROP POLICY IF EXISTS "Todos ven documentos_legales" ON public.documentos_legales;
    -- Configuracion
    DROP POLICY IF EXISTS "Todo el mundo lee la configuración" ON public.configuracion;
    DROP POLICY IF EXISTS "Admin acceso total a configuración" ON public.configuracion;

    -- Borrar tambien las nuevas politicas (para que el script se pueda ejecutar varias veces sin error)
    DROP POLICY IF EXISTS "Superadmin gestiona empresas" ON public.empresas;
    DROP POLICY IF EXISTS "Usuarios ven su propia empresa" ON public.empresas;
    DROP POLICY IF EXISTS "Superadmin total profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admin de empresa total profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Tecnicos y clientes ven profiles de su empresa" ON public.profiles;
    DROP POLICY IF EXISTS "Superadmin total clientes" ON public.clientes;
    DROP POLICY IF EXISTS "Admin de empresa total clientes" ON public.clientes;
    DROP POLICY IF EXISTS "Tecnicos leen clientes de su empresa" ON public.clientes;
    DROP POLICY IF EXISTS "Superadmin total ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Admin empresa total ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Tecnicos info y read ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Tecnicos actualizan sus ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Clientes ven sus ordenes" ON public.ordenes_servicio;
    DROP POLICY IF EXISTS "Superadmin total productos_usados" ON public.productos_usados;
    DROP POLICY IF EXISTS "Admin empresa total productos" ON public.productos_usados;
    DROP POLICY IF EXISTS "Tecnicos gestionan productos" ON public.productos_usados;
    DROP POLICY IF EXISTS "Clientes ven productos" ON public.productos_usados;
    DROP POLICY IF EXISTS "Superadmin total fotos" ON public.fotos_servicio;
    DROP POLICY IF EXISTS "Admin empresa total fotos" ON public.fotos_servicio;
    DROP POLICY IF EXISTS "Superadmin total certificados" ON public.certificados;
    DROP POLICY IF EXISTS "Admin empresa total certificados" ON public.certificados;
    DROP POLICY IF EXISTS "Tecnicos leen certificados" ON public.certificados;
    DROP POLICY IF EXISTS "Clientes ven certificados" ON public.certificados;
    DROP POLICY IF EXISTS "Superadmin total actividades" ON public.actividades_servicio;
    DROP POLICY IF EXISTS "Admin empresa total actividades" ON public.actividades_servicio;
    DROP POLICY IF EXISTS "Tecnicos gestionan actividades" ON public.actividades_servicio;
    DROP POLICY IF EXISTS "Clientes ven actividades" ON public.actividades_servicio;
    DROP POLICY IF EXISTS "Superadmin total documentos" ON public.documentos_legales;
    DROP POLICY IF EXISTS "Admin sube documentos empresa" ON public.documentos_legales;
    DROP POLICY IF EXISTS "Todos leen documentos empresa" ON public.documentos_legales;
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
