import { useState } from 'react'
import api from '../../lib/api'
import { Lock, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)

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
      const token = localStorage.getItem('token')
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword: password
      }, { token })

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
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Cambiar Contraseña" 
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Guardar
              </div>
            )}
          </button>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading} 
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}
