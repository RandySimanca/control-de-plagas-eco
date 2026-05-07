import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente auxiliar sin persistencia de sesión: usado exclusivamente para crear usuarios
// sin pisar la sesión activa del administrador.
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, storageKey: 'sb-admin-no-session' }
})
