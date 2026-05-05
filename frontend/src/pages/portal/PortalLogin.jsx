import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import RoleModal from '../../components/RoleModal'
import { Bug, LogIn, Loader2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PortalLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const { login, logout } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) { toast.error('Ingresa tus credenciales'); return }
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

      if (profile?.rol !== 'cliente') {
        setShowRoleModal(true)
        return
      }

      toast.success('¡Bienvenido al portal!')
      navigate('/portal')
    } catch (err) {
      console.error('Login error:', err)
      toast.error('Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-800 via-dark-900 to-primary-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/20 border border-primary-500/30 rounded-2xl mb-4">
            <Bug className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Portal de Clientes</h1>
          <p className="text-dark-400 mt-1">PlagControl — Accede a tu historial de servicios</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Iniciar Sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-dark-300 mb-1.5">Correo electrónico</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 pr-11"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <Link to="/forgot-password" className="text-sm font-medium text-primary-400 hover:text-primary-300 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5" /> Acceder al Portal</>}
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-primary-400 hover:text-primary-300 font-medium">
              ← Acceso para Técnicos y Personal
            </Link>
          </div>
        </div>
      </div>

      <RoleModal
        isOpen={showRoleModal}
        onClose={async () => {
          await logout()
          navigate('/login')
        }}
        title="Acceso de Personal"
        message="Esta cuenta pertenece al equipo técnico o administrativo. Por favor, utiliza el acceso para personal."
        buttonText="Ir al Login de Personal"
      />
    </div>
  )
}
