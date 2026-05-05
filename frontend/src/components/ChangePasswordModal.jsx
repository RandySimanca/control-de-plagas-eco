import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { X, Lock, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { profile } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!currentPassword) {
      toast.error('Ingresa tu contraseña actual para continuar')
      return
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== passwordConfirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (password === currentPassword) {
      toast.error('La nueva contraseña debe ser diferente a la actual')
      return
    }

    setLoading(true)
    try {
      // Verificar contraseña actual re-autenticando al usuario
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email,
        password: currentPassword
      })
      if (signInError) {
        toast.error('La contraseña actual es incorrecta')
        setLoading(false)
        return
      }

      // Si la verificación pasa, proceder a actualizar
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      toast.success('Contraseña actualizada correctamente')
      setCurrentPassword('')
      setPassword('')
      setPasswordConfirm('')
      onClose()
    } catch (error) {
      toast.error(error.message || 'Error al actualizar contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-[fadeInUp_0.2s_ease-out]">
        <div className="px-6 py-5 border-b border-dark-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-dark-900">
            <Lock className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold">Cambiar Contraseña</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-100 rounded-xl transition-colors text-dark-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label-field">Contraseña Actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="input-field"
              placeholder="Tu contraseña actual"
              required
            />
          </div>

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
            <label className="label-field">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              className="input-field"
              placeholder="Repite la nueva contraseña"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><Save className="w-4 h-4" /> Guardar</>}
            </button>
            <button type="button" onClick={onClose} disabled={loading} className="btn-secondary flex-1">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
