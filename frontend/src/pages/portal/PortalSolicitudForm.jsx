import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PortalSolicitudForm() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tipo_servicio: 'Desinsectación',
    descripcion: '',
    direccion: profile?.direccion || '',
    fecha_preferida: ''
  })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.descripcion.trim()) {
      return toast.error('Por favor describe lo que necesitas')
    }
    if (!profile?.cliente_id || !profile?.empresa_id) {
      return toast.error('Error de sesión: recarga la página e inicia sesión de nuevo')
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('solicitudes_servicio')
        .insert({
          cliente_id: profile.cliente_id,
          empresa_id: profile.empresa_id,
          tipo_servicio: formData.tipo_servicio,
          descripcion: formData.descripcion,
          direccion: formData.direccion,
          fecha_preferida: formData.fecha_preferida || null,
          estado: 'pendiente'
        })

      if (error) throw error

      toast.success('Solicitud enviada correctamente')
      navigate('/portal', { state: { tab: 'solicitudes' } })
    } catch (err) {
      console.error('Error al enviar solicitud:', err)
      toast.error('No se pudo enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate('/portal')}
          className="flex items-center gap-2 text-dark-500 hover:text-dark-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Portal
        </button>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-900">Nueva Solicitud de Servicio</h1>
              <p className="text-sm text-dark-500">Cuéntanos qué necesitas y te responderemos pronto</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label-field">Tipo de Servicio</label>
              <select
                className="input-field"
                value={formData.tipo_servicio}
                onChange={(e) => setFormData({ ...formData, tipo_servicio: e.target.value })}
              >
                <option value="Desinsectación">Desinsectación (Cucarachas, Hormigas, etc.)</option>
                <option value="Desratización">Desratización (Roedores)</option>
                <option value="Desinfección">Desinfección (Virus, Bacterias)</option>
                <option value="Control de Aves">Control de Aves</option>
                <option value="Otro">Otro servicio</option>
              </select>
            </div>

            <div>
              <label className="label-field">Dirección del Servicio</label>
              <input
                type="text"
                className="input-field"
                placeholder="Dirección donde se requiere el servicio"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label-field">Fecha Preferida (Opcional)</label>
              <input
                type="date"
                className="input-field"
                min={new Date().toISOString().split('T')[0]}
                value={formData.fecha_preferida}
                onChange={(e) => setFormData({ ...formData, fecha_preferida: e.target.value })}
              />
            </div>

            <div>
              <label className="label-field">¿Qué problema tienes? (Descripción)</label>
              <textarea
                className="input-field min-h-[120px] resize-none"
                placeholder="Describe brevemente el problema para darte una mejor cotización..."
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/portal')}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 gap-2"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Enviar Solicitud <Send className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
