-- =====================================================
-- PlagControl - Auth propia (JWT + sesiones)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.usuarios_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'bloqueado')),
  email_verificado BOOLEAN NOT NULL DEFAULT false,
  ultimo_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Una sesión por refresh token (rotación de refresh tokens).
CREATE TABLE IF NOT EXISTS public.auth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.usuarios_auth(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_user ON public.auth_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_expires ON public.auth_refresh_tokens(expires_at);

-- Flujo de recuperación de contraseña.
CREATE TABLE IF NOT EXISTS public.auth_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.usuarios_auth(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_resets_user ON public.auth_password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_resets_expires ON public.auth_password_resets(expires_at);

-- Opcional pero recomendado: auditoría básica de eventos de auth.
CREATE TABLE IF NOT EXISTS public.auth_eventos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.usuarios_auth(id) ON DELETE SET NULL,
  evento TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_eventos_user ON public.auth_eventos(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_eventos_created_at ON public.auth_eventos(created_at);
