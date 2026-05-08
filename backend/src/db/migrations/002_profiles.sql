-- 002: Profiles Table (Consolidated Auth & Details)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  rol TEXT NOT NULL DEFAULT 'tecnico' CHECK (rol IN ('admin', 'tecnico', 'cliente')),
  especialidad TEXT,
  firma_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a basic users table for compatibility if needed, 
-- but main logic is in profiles as per current backend implementation.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
