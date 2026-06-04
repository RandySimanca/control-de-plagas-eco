import { createContext, useContext, useState, useEffect } from 'react'
import * as authApi from '../api/auth.api'

const AuthContext = createContext({})

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

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

  async function fetchProfile() {
    try {
      const token = localStorage.getItem('token')
      const data = await authApi.getMe(token)
      setUser(data.user || data) // El backend retorna { user } o directamente el perfil
      setProfile(data.user || data)
    } catch (err) {
      console.error('Error cargando perfil:', err)
      localStorage.removeItem('token')
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

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
