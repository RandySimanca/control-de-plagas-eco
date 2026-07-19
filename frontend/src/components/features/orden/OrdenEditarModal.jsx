import { useState, useEffect } from 'react'
import { X, Save, Loader2, Droplets } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import { parseTipoPlaga } from '../../../utils/tipoPlaga'

export default function OrdenEditarModal({ orden, onClose, onSave, queueOrExecute }) {
  const [tecnicos, setTecnicos] = useState([])
  const [loadingTecnicos, setLoadingTecnicos] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    tecnico_id: orden.tecnico_id || '',
    fecha_programada: orden.fecha_programada ? orden.fecha_programada.split('T')[0] : '',
    tipo_plaga: parseTipoPlaga(orden.tipo_plaga),
    observaciones: orden.observaciones || '',
    estado: orden.estado || 'programada',
    lavado_tanques: orden.lavado_tanques || false,
    lavado_tanques_cantidad: orden.lavado_tanques_cantidad || 1
  })

  useEffect(() => {
    const fetchTecnicos = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await api.get('/profiles', { token, params: { rol: 'tecnico', activo: true } })
        setTecnicos(res.data || [])
      } catch (err) {
        console.error('Error loading tecnicos:', err)
        toast.error('Error al cargar técnicos')
      } finally {
        setLoadingTecnicos(false)
      }
    }
    fetchTecnicos()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updates = {
        id: orden.id,
        tecnico_id: form.tecnico_id || null,
        fecha_programada: form.fecha_programada || null,
        tipo_plaga: Array.isArray(form.tipo_plaga) ? form.tipo_plaga.join(', ') : form.tipo_plaga,
        observaciones: form.observaciones,
        estado: form.estado,
        lavado_tanques: form.lavado_tanques,
        lavado_tanques_cantidad: form.lavado_tanques ? form.lavado_tanques_cantidad : 0,
        updated_at: new Date().toISOString()
      }
      
      const { queued } = await queueOrExecute('ordenes_servicio', 'update', updates, orden.id)
      
      const selectedTecnico = tecnicos.find(t => t.id === form.tecnico_id)
      const updatedOrden = { 
        ...orden, 
        ...updates,
        profiles: selectedTecnico ? { nombre_completo: selectedTecnico.nombre_completo } : orden.profiles
      }
      
      toast.success(queued ? 'Actualización guardada offline ⚡' : 'Orden actualizada correctamente')
      onSave(updatedOrden)
    } catch (err) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-dark-100">
          <h2 className="text-lg font-bold text-dark-900">Editar Orden</h2>
          <button onClick={onClose} className="p-2 text-dark-400 hover:text-dark-700 hover:bg-dark-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Técnico Asignado</label>
              <select 
                className="input-field"
                value={form.tecnico_id}
                onChange={e => setForm(f => ({ ...f, tecnico_id: e.target.value }))}
                disabled={loadingTecnicos}
              >
                <option value="">Sin asignar</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Fecha Programada</label>
              <input 
                type="date"
                className="input-field"
                value={form.fecha_programada}
                onChange={e => setForm(f => ({ ...f, fecha_programada: e.target.value }))}
              />
            </div>
            <div>
              <label className="label-field">Estado</label>
              <select
                className={`input-field font-semibold ${
                  form.estado === 'programada' ? 'text-amber-700' :
                  form.estado === 'en_progreso' ? 'text-blue-700' :
                  'text-green-700'
                }`}
                value={form.estado}
                onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
              >
                <option value="programada">Programada</option>
                <option value="en_progreso">En Progreso</option>
                <option value="completada">Completada</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-field">Tipo de Control</label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md">
              {['Desinsectación', 'Desratización', 'Desinfección', 'Desodoracion', 'Lavado de Tanques'].map(tipo => {
                const seleccionado = form.tipo_plaga.includes(tipo);
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => {
                      const nuevos = seleccionado 
                        ? form.tipo_plaga.filter(t => t !== tipo)
                        : [...form.tipo_plaga, tipo];
                      
                      if (tipo === 'Lavado de Tanques') {
                        setForm(f => ({ 
                          ...f, 
                          tipo_plaga: nuevos,
                          lavado_tanques: !seleccionado,
                          lavado_tanques_cantidad: !seleccionado ? (f.lavado_tanques_cantidad || 1) : 0
                        }))
                      } else {
                        setForm(f => ({ ...f, tipo_plaga: nuevos }))
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      seleccionado
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tipo}
                  </button>
                )
              })}
            </div>
            {form.lavado_tanques && (
              <div className="mt-3 flex items-center gap-2 p-2 bg-cyan-50 border border-cyan-200 rounded-md">
                <label className="text-sm text-cyan-800 font-medium">Cantidad de tanques:</label>
                <input
                  type="number"
                  min="1"
                  value={form.lavado_tanques_cantidad || 1}
                  onChange={e => setForm(f => ({ ...f, lavado_tanques_cantidad: parseInt(e.target.value) || 1 }))}
                  className="w-16 text-center border border-cyan-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            )}
          </div>

          <div>
            <label className="label-field">Observaciones</label>
            <textarea
              className="input-field"
              rows={3}
              value={form.observaciones}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              placeholder="Notas adicionales..."
            />
          </div>



          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar Cambios</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
