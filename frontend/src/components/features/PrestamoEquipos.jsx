import { useState, useEffect } from 'react'
import { Package, PackageCheck, PackageMinus, X, Loader2, CheckSquare, Square } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function PrestamoEquipos({ isOpen, onClose, tecnicoId, hasPendingOrders = true }) {
  const [activeTab, setActiveTab] = useState('sacar') // 'sacar' | 'devolver'
  const [activosDisponibles, setActivosDisponibles] = useState([])
  const [misActivos, setMisActivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
      setSelectedIds([])
    }
  }, [isOpen])

  const loadData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const [dispRes, prestadosRes] = await Promise.all([
        api.get('/productos-catalogo/activos/disponibles', { token }),
        api.get(`/productos-catalogo/activos/prestados/${tecnicoId}`, { token })
      ])
      setActivosDisponibles(dispRes.data || [])
      setMisActivos(prestadosRes.data || [])
    } catch (err) {
      toast.error('Error cargando equipos')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return toast.error('Selecciona al menos un equipo')
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const url = activeTab === 'sacar' ? '/productos-catalogo/activos/prestar' : '/productos-catalogo/activos/devolver'
      await api.post(url, { tecnico_id: tecnicoId, activos_ids: selectedIds }, { token })

      toast.success(activeTab === 'sacar' ? 'Equipos registrados para salida' : 'Equipos devueltos con éxito')
      setSelectedIds([])
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al procesar la solicitud')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const listToShow = activeTab === 'sacar' ? activosDisponibles : misActivos
  const emptyMessage = activeTab === 'sacar' ? 'No hay equipos disponibles en bodega' : 'No tienes equipos en tu poder'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:rounded-2xl max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-dark-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-dark-900">Mis Equipos (Entrada / Salida)</h2>
              <p className="text-xs text-dark-500">Registra qué llevas a campo y qué devuelves</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-dark-400 hover:text-dark-600 bg-dark-50 hover:bg-dark-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-dark-100">
          <button
            onClick={() => { setActiveTab('sacar'); setSelectedIds([]); }}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'sacar' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/30' : 'text-dark-500 hover:bg-dark-50'}`}
          >
            <PackageMinus className="w-4 h-4" /> Sacar de Bodega
          </button>
          <button
            onClick={() => { setActiveTab('devolver'); setSelectedIds([]); }}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'devolver' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/30' : 'text-dark-500 hover:bg-dark-50'}`}
          >
            <PackageCheck className="w-4 h-4" /> Devolver a Bodega
            {misActivos.length > 0 && (
              <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full">{misActivos.length}</span>
            )}
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-dark-50/30">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : listToShow.length === 0 ? (
            activeTab === 'sacar' && !hasPendingOrders ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-5xl mb-4">🚫</span>
                <h3 className="text-base font-bold text-dark-800 mb-2">Sin órdenes activas</h3>
                <p className="text-sm text-dark-500 max-w-xs">No puedes sacar equipos porque no tienes órdenes de trabajo programadas o en progreso en este momento.</p>
              </div>
            ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-dark-200">
              <Package className="w-12 h-12 text-dark-200 mx-auto mb-3" />
              <p className="text-dark-500 font-medium">{emptyMessage}</p>
            </div>
            )
          ) : (
            <div className="space-y-3">
              {listToShow.map(a => {
                const isSelected = selectedIds.includes(a.id)
                return (
                  <div
                    key={a.id}
                    onClick={() => toggleSelect(a.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-orange-50/50 border-orange-300 shadow-sm' : 'bg-white border-dark-200 hover:border-orange-200'}`}
                  >
                    <div className={`text-${isSelected ? 'orange-600' : 'dark-300'}`}>
                      {isSelected ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-dark-900 text-sm">
                        {a.nombre || a.nombre_comercial}
                      </h4>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Código / Activo Empresa: <span className="font-bold text-dark-700">{a.codigo_activo}</span>
                      </p>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-dark-500">
                        {a.marca && <span><span className="font-medium text-dark-400">Marca:</span> {a.marca}</span>}
                        {a.modelo && <span><span className="font-medium text-dark-400">Mod:</span> {a.modelo}</span>}
                        {a.numero_serie && <span><span className="font-medium text-dark-400">S/N:</span> {a.numero_serie}</span>}
                      </div>

                      {a.notas && <p className="text-xs text-dark-400 mt-1.5 italic">"{a.notas}"</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-dark-100 bg-white">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedIds.length === 0}
            className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${selectedIds.length === 0 ? 'bg-dark-200 text-dark-400 cursor-not-allowed' :
                activeTab === 'sacar' ? 'bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20' :
                  'bg-green-600 hover:bg-green-700 shadow-md shadow-green-600/20'
              }`}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              activeTab === 'sacar' ? 'Confirmar Salida de Equipos' : 'Confirmar Devolución'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
