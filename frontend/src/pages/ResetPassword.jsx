import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Bug, Lock, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Escuchar cambios de estado para asegurar que la vista es llamada a través del enlace del correo
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        // En este punto el usuario está autenticado implícitamente por el enlace
        toast.info('Ingresa tu nueva contraseña')
      }
    });
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== passwordConfirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      // Destruir la sesión iniciada por el token de recuperación por seguridad
      await supabase.auth.signOut()

      toast.success('Contraseña actualizada correctamente')
      navigate('/login')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Error al restablecer la contraseña. Es posible que el enlace haya expirado.')
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
          <p className="text-primary-300 mt-1">Crear nueva contraseña</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-dark-900 mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary-600" /> Nueva Contraseña
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-field">Nueva Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div>
              <label className="label-field">Confirmar Contraseña</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                className="input-field"
                placeholder="Repite tu contraseña"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-4">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Guardar Contraseña</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
