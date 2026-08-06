import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as authApi from '../api/auth.api'

const AuthContext = createContext({})

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

const PROFILE_CACHE_KEY = 'auth_profile_cache'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const data = await authApi.getMe(token)
      const profileData = data.user || data
      // Guardar perfil en caché local para uso offline
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profileData))
      setUser(profileData)
      setProfile(profileData)
    } catch (err) {
      // Si el error es por falta de conexión, usar el perfil en caché
      if (!navigator.onLine) {
        const cached = localStorage.getItem(PROFILE_CACHE_KEY)
        if (cached) {
          try {
            const cachedProfile = JSON.parse(cached)
            setUser(cachedProfile)
            setProfile(cachedProfile)
            console.info('Modo offline: usando perfil en caché')
            return
          } catch {
            // Ignorar error de parse
          }
        }
      }
      // Solo limpiar sesión si el error es de autenticación real (no de red)
      console.error('Error cargando perfil:', err)
      localStorage.removeItem('token')
      localStorage.removeItem(PROFILE_CACHE_KEY)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  async function login(email, password) {
    const data = await authApi.login(email, password)
    if (data.token) {
      localStorage.setItem('token', data.token)
      await fetchProfile()
    }
    return data
  }

  async function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem(PROFILE_CACHE_KEY)
    setUser(null)
    setProfile(null)
  }

  const isAdmin = profile?.rol === 'admin'
  const isTecnico = profile?.rol === 'tecnico'
  const isCliente = profile?.rol === 'cliente'

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      login,
      logout,
      isAdmin,
      isTecnico,
      isCliente
    }}>
      {children}
    </AuthContext.Provider>
  )
}
