import { useState, useEffect } from 'react'
import { Beaker, ArrowDownToLine, ArrowUpFromLine, X, Loader2, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function PrestamoInsumos({ isOpen, onClose, tecnicoId }) {
  const [activeTab, setActiveTab] = useState('sacar') // 'sacar' | 'devolver'
  const [catalogo, setCatalogo] = useState([])
  const [misInsumos, setMisInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Para sacar de bodega
  const [selectedProducto, setSelectedProducto] = useState(null)
  const [cantidadSacar, setCantidadSacar] = useState('')
  const [lote, setLote] = useState('')

  // Para devolver
  const [devoluciones, setDevoluciones] = useState({}) // { id_inventario: cantidad_devuelta }

  useEffect(() => {
    if (isOpen) {
      loadData()
      resetForm()
    }
  }, [isOpen, activeTab])

  const resetForm = () => {
    setSelectedProducto(null)
    setCantidadSacar('')
    setLote('')
    setDevoluciones({})
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (activeTab === 'sacar') {
        const { data } = await api.get('/productos-catalogo', { token })
        // Filtramos solo insumos fungibles (excluimos equipos y activos fijos si los hay, aunque equipos ya están separados en EPP/Activos)
        setCatalogo(data?.filter(p => p.estado === 'activo' && p.categoria !== 'equipo' && p.categoria !== 'epp') || [])
      } else {
        const { data } = await api.get(`/productos-tecnicos/${tecnicoId}`, { token })
        setMisInsumos(data?.data || [])
        // Inicializar devoluciones con el sobrante esperado
        const initialDevs = {}
          ; (data?.data || []).forEach(item => {
            initialDevs[item.id] = Math.max(0, parseFloat(item.cantidad_sacada) - parseFloat(item.cantidad_usada))
          })
        setDevoluciones(initialDevs)
      }
    } catch (err) {
      toast.error('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  const handleSacar = async (e) => {
    e.preventDefault()
    if (!selectedProducto || !cantidadSacar) return toast.error('Selecciona producto y cantidad')

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      await api.post('/productos-tecnicos/check-out', {
        tecnico_id: tecnicoId,
        items: [{ catalogo_id: selectedProducto.id, cantidad: parseFloat(cantidadSacar), lote }]
      }, { token })

      toast.success('Insumo registrado en tu vehículo')
      resetForm()
      // Opcional: recargar datos o mostrar mensaje
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al procesar la salida')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDevolver = async () => {
    const items = Object.entries(devoluciones)
      .map(([id, cant]) => ({ id, cantidad_devuelta: parseFloat(cant) }))
      .filter(item => !isNaN(item.cantidad_devuelta))

    if (items.length === 0) return toast.error('No hay nada que devolver')

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      await api.post('/productos-tecnicos/check-in', {
        tecnico_id: tecnicoId,
        items
      }, { token })

      toast.success('Sobrantes devueltos a bodega')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al procesar devolución')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:rounded-2xl max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-dark-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
              <Beaker className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-dark-900">Mis Insumos (Entrada / Salida)</h2>
              <p className="text-xs text-dark-500">Registra qué insumos llevas a campo y devuelve los sobrantes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-dark-400 hover:text-dark-600 bg-dark-50 hover:bg-dark-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-dark-100">
          <button
            onClick={() => setActiveTab('sacar')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'sacar' ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50/30' : 'text-dark-500 hover:bg-dark-50'}`}
          >
            <ArrowUpFromLine className="w-4 h-4" /> Sacar de Bodega
          </button>
          <button
            onClick={() => setActiveTab('devolver')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'devolver' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/30' : 'text-dark-500 hover:bg-dark-50'}`}
          >
            <ArrowDownToLine className="w-4 h-4" /> Devolver a Bodega
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-dark-50/30">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
            </div>
          ) : activeTab === 'sacar' ? (
            <form onSubmit={handleSacar} className="space-y-4">
              <div>
                <label className="label-field">Producto a Sacar</label>
                <select
                  className="input-field"
                  value={selectedProducto?.id || ''}
                  onChange={e => {
                    const prod = catalogo.find(p => p.id === e.target.value)
                    setSelectedProducto(prod)
                    setLote(prod?.lote || '') // autocompletar lote del catálogo
                  }}
                  required
                >
                  <option value="">Seleccione un producto...</option>
                  {catalogo.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre_comercial} ({parseFloat(p.stock_actual)} {p.unidad_base} disp.)
                      {p.lote ? ` · Lote: ${p.lote}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProducto && (
                <>
                  {/* Info de trazabilidad del producto seleccionado */}
                  {(selectedProducto.lote || selectedProducto.fecha_vencimiento) && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs">
                      <span className="text-lg leading-none">🏷️</span>
                      <div className="space-y-0.5">
                        {selectedProducto.lote && (
                          <p className="font-bold text-amber-800">Lote: <span className="font-semibold">{selectedProducto.lote}</span></p>
                        )}
                        {selectedProducto.fecha_vencimiento && (
                          <p className="text-amber-700">
                            Vence: <span className="font-semibold">{new Date(selectedProducto.fecha_vencimiento).toLocaleDateString('es-CO')}</span>
                            {new Date(selectedProducto.fecha_vencimiento) < new Date() && (
                              <span className="ml-1 text-red-600 font-bold">⚠️ VENCIDO</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stock disponible en bodega */}
                  <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${parseFloat(selectedProducto.stock_actual) === 0
                      ? 'bg-red-50 border-red-200'
                      : parseFloat(selectedProducto.stock_actual) <= parseFloat(selectedProducto.stock_minimo || 0)
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-green-50 border-green-200'
                    }`}>
                    <div>
                      <p className="text-xs font-bold text-dark-500 uppercase tracking-wider">Stock disponible en bodega</p>
                      <p className={`text-2xl font-black mt-0.5 ${parseFloat(selectedProducto.stock_actual) === 0
                          ? 'text-red-600'
                          : parseFloat(selectedProducto.stock_actual) <= parseFloat(selectedProducto.stock_minimo || 0)
                            ? 'text-amber-600'
                            : 'text-green-700'
                        }`}>
                        {parseFloat(parseFloat(selectedProducto.stock_actual).toFixed(3))}
                        <span className="text-sm font-semibold ml-1 text-dark-500">{selectedProducto.unidad_base}</span>
                      </p>
                    </div>
                    <span className="text-3xl">
                      {parseFloat(selectedProducto.stock_actual) === 0 ? '📭' :
                        parseFloat(selectedProducto.stock_actual) <= parseFloat(selectedProducto.stock_minimo || 0) ? '⚠️' : '✅'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="label-field mb-0">Cantidad a sacar ({selectedProducto.unidad_base})</label>
                        <span className="text-xs text-dark-400">Máx: {parseFloat(parseFloat(selectedProducto.stock_actual).toFixed(3))}</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={selectedProducto.stock_actual}
                        className="input-field"
                        value={cantidadSacar}
                        onChange={e => setCantidadSacar(e.target.value)}
                        required
                        placeholder="Ej: 10"
                      />
                      {cantidadSacar && parseFloat(cantidadSacar) > parseFloat(selectedProducto.stock_actual) && (
                        <p className="text-xs text-red-600 font-medium mt-1">⚠️ Supera el stock disponible</p>
                      )}
                    </div>
                    <div>
                      <label className="label-field">Lote o Identificador</label>
                      <input
                        type="text"
                        className="input-field"
                        value={lote}
                        onChange={e => setLote(e.target.value)}
                        placeholder="Ej: Lote A-123 o Botella 1"
                      />
                      <p className="text-[10px] text-dark-400 mt-1">Autocompletado desde el catálogo. Puedes modificarlo.</p>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !selectedProducto}
                className="btn-primary w-full bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/20 mt-4"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirmar Salida de Bodega'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {misInsumos.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-dark-200">
                  <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-dark-500 font-medium">No tienes insumos pendientes por devolver.</p>
                </div>
              ) : (
                <>
                  {misInsumos.map(item => {
                    const sobranteCalculado = Math.max(0, parseFloat(item.cantidad_sacada) - parseFloat(item.cantidad_usada))
                    return (
                      <div key={item.id} className="bg-white p-4 rounded-xl border border-dark-200">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-dark-900">{item.nombre_comercial}</h4>
                            {item.lote && <p className="text-xs text-dark-500">Lote: <span className="font-semibold">{item.lote}</span></p>}
                          </div>
                          <div className="text-right text-xs text-dark-500 space-y-0.5">
                            <p>Sacado: <span className="font-bold text-dark-700">{item.cantidad_sacada} {item.unidad_base}</span></p>
                            <p>Usado en Órdenes: <span className="font-bold text-dark-700">{item.cantidad_usada} {item.unidad_base}</span></p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-3 border-t border-dark-100">
                          <label className="text-sm font-medium text-dark-700 flex-1">¿Cuánto devuelves a bodega?</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={sobranteCalculado}
                              className="input-field w-24 text-right py-1.5"
                              value={devoluciones[item.id] ?? sobranteCalculado}
                              onChange={e => setDevoluciones(p => ({ ...p, [item.id]: e.target.value }))}
                            />
                            <span className="text-sm font-medium text-dark-500 w-8">{item.unidad_base}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <button
                    onClick={handleDevolver}
                    disabled={isSubmitting}
                    className="btn-primary w-full bg-green-600 hover:bg-green-700 shadow-green-600/20 mt-4"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirmar Devolución'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
