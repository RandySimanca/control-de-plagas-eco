import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import RoleModal from '../components/RoleModal'
import { Bug, LogIn, Loader2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const { login, logout } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Ingresa tu email y contraseña')
      return
    }
    setLoading(true)
    try {
      const { user } = await login(email, password)
      
      // Verificar rol inmediatamente
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      if (profile?.rol === 'cliente') {
        setShowRoleModal(true)
        return
      }

      toast.success('¡Bienvenido!')
      if (profile?.rol === 'superadmin') {
        navigate('/superadmin')
      } else {
        navigate('/')
      }
    } catch (err) {
      console.error('Login error:', err)
      toast.error(err.message === 'Invalid login credentials'
        ? 'Credenciales incorrectas'
        : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-dark-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/30 mb-4">
            <Bug className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">PlagControl</h1>
          <p className="text-primary-300 mt-1">Sistema de Gestión de Control de Plagas</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-dark-900 mb-6">Iniciar Sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-field" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label-field" htmlFor="password">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5" /> Ingresar</>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/portal/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              ¿Eres cliente? Accede al portal →
            </Link>
          </div>
        </div>
      </div>

      <RoleModal
        isOpen={showRoleModal}
        onClose={async () => {
          await logout()
          navigate('/portal/login')
        }}
        title="Acceso de Clientes"
        message="Esta cuenta pertenece a un cliente. Por favor, utiliza el Portal de Clientes para acceder a tus servicios."
        buttonText="Ir al Portal de Clientes"
      />
    </div>
  )
}
