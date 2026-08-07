import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Send, Droplets } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import HelpButton from '../../components/features/HelpButton'
import { HELP_CONTENT } from '../../lib/helpContent'
export default function PortalSolicitudForm() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tipo_servicio: ['Desinsectación'],
    descripcion: '',
    direccion: profile?.direccion || '',
    fecha_preferida: ''
  })
  const [otroServicio, setOtroServicio] = useState('')
  const [cantidadTanques, setCantidadTanques] = useState('')
  const [tipoTanque, setTipoTanque] = useState('Elevado')
  const [materialTanque, setMaterialTanque] = useState('Polietileno')

async function handleSubmit(e) {
      e.preventDefault()
      if (!formData.descripcion.trim()) {
        return toast.error('Por favor describe lo que necesitas')
      }
      if (!profile?.cliente_id) {
        return toast.error('Error de sesión: recarga la página e inicia sesión de nuevo')
      }

      setLoading(true)

      try {
        const token = localStorage.getItem('token')
        const tiposFinales = formData.tipo_servicio.includes('Otro') && otroServicio
            ? formData.tipo_servicio.map(t => t === 'Otro' ? otroServicio : t)
            : formData.tipo_servicio

        // Añadir información de tanques a la descripción si aplica
        const infotanques = formData.tipo_servicio.includes('Lavado de Tanques')
          ? `\n\n[Lavado de Tanques]\n- Cantidad de tanques: ${cantidadTanques || 1}\n- Tipo / Ubicación: ${tipoTanque}\n- Material: ${materialTanque}`
          : ''

        await api.post('/solicitudes-servicio', {
          cliente_id: profile.cliente_id,
          tipo_servicio: tiposFinales.join(', '),
          descripcion: formData.descripcion + infotanques,
          direccion: formData.direccion,
          fecha_preferida: formData.fecha_preferida || null,
          estado: 'pendiente'
        }, { token })

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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-dark-900">Nueva Solicitud de Servicio</h1>
                <HelpButton title="Nueva Solicitud de Servicio" content={HELP_CONTENT.portalSolicitudForm} />
              </div>
              <p className="text-sm text-dark-500">Cuéntanos qué necesitas y te responderemos pronto</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label-field">Tipo de Servicio</label>
              <div className="flex flex-wrap gap-2 p-2 border border-dark-200 rounded-xl bg-white">
                {['Desinsectación', 'Desratización', 'Desinfección', 'Control de Aves', 'Lavado de Tanques', 'Otro'].map(tipo => {
                  const seleccionado = formData.tipo_servicio.includes(tipo);
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() =>
                        setFormData(p => {
                          const actuales = p.tipo_servicio || [];
                          const nuevos = actuales.includes(tipo)
                            ? actuales.filter(t => t !== tipo)
                            : [...actuales, tipo];
                          return { ...p, tipo_servicio: nuevos.length ? nuevos : ['Desinsectación'] };
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        seleccionado
                          ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                          : 'bg-dark-50 text-dark-600 hover:bg-dark-100'
                      }`}
                    >
                      {tipo}
                    </button>
                  );
                })}
              </div>
            </div>

            {formData.tipo_servicio.includes('Lavado de Tanques') && (
              <div className="space-y-4 p-4 bg-cyan-50/60 border border-cyan-200/80 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-cyan-900 font-bold text-sm">
                  <Droplets className="w-5 h-5 text-cyan-600" />
                  <span>Especificaciones del Lavado de Tanques</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-700">¿Cuántos tanques se van a lavar? *</label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    className="w-full bg-white border border-dark-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm"
                    placeholder="Ej: 2"
                    value={cantidadTanques}
                    onChange={(e) => setCantidadTanques(e.target.value)}
                    required={formData.tipo_servicio.includes('Lavado de Tanques')}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-700">Tipo / Ubicación del Tanque *</label>
                  <div className="flex flex-wrap gap-2">
                    {['Elevado', 'Subterráneo', 'A Nivel'].map(tipo => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setTipoTanque(tipo)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          tipoTanque === tipo
                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                            : 'bg-white text-dark-600 hover:bg-cyan-100/50 border border-dark-200'
                        }`}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-dark-700">Material del Tanque *</label>
                  <div className="flex flex-wrap gap-2">
                    {['Concreto', 'Polietileno', 'Fibra de vidrio', 'Acero inoxidable', 'Metálico', 'Otro'].map(mat => (
                      <button
                        key={mat}
                        type="button"
                        onClick={() => setMaterialTanque(mat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          materialTanque === mat
                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                            : 'bg-white text-dark-600 hover:bg-cyan-100/50 border border-dark-200'
                        }`}
                      >
                        {mat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {formData.tipo_servicio.includes('Otro') && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="label-field">Especifique el servicio *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: Reubicación de panal de abejas..."
                  value={otroServicio}
                  onChange={(e) => setOtroServicio(e.target.value)}
                  required={formData.tipo_servicio.includes('Otro')}
                />
              </div>
            )}

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
