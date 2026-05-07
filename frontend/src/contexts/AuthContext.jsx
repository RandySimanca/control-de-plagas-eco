import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

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
      const data = await api.get('/auth/me', { token })
      setUser(data.user)
      setProfile(data.user)
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
    const data = await api.post('/auth/login', { email, password })
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
  const isSuperadmin = profile?.rol === 'superadmin'

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      login,
      logout,
      isAdmin,
      isTecnico,
      isCliente,
      isSuperadmin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
