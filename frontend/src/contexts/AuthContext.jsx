import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Forzar redirección al panel de cambio de contraseña cuando se trata de una recuperación
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
        navigate('/reset-password' + window.location.hash)
      }

      setUser(session?.user ?? null)
      if (session?.user) {
        setLoading(true)
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, empresas(*)')
        .eq('id', userId)
        .single()
      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Error cargando perfil:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  const isSuperadmin = profile?.rol === 'superadmin'
  const isAdmin = profile?.rol === 'admin'
  const isTecnico = profile?.rol === 'tecnico'
  const isCliente = profile?.rol === 'cliente'
  const empresa = profile?.empresas || null
  const isLicenciaVencida = empresa?.estado_licencia === 'vencida' || empresa?.estado_licencia === 'suspendida'
  const isLicenciaExpiradaPorFecha = empresa?.fecha_vencimiento && new Date(empresa.fecha_vencimiento) < new Date()
  const licenseExpired = (isLicenciaVencida || isLicenciaExpiradaPorFecha) && !isSuperadmin

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      login,
      logout,
      isSuperadmin,
      isAdmin,
      isTecnico,
      isCliente,
      empresa,
      licenseExpired,
      licenseWarning: (isLicenciaVencida || isLicenciaExpiradaPorFecha) && isCliente,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
