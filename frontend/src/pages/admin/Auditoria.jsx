import { useState, useEffect, useCallback } from 'react'
import { FileSearch, Search, Filter, Download, User, Package, Calendar, Loader2, X, ShieldCheck, Tag, AlertCircle, Package2 } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import HelpButton from '../../components/features/HelpButton'
import { HELP_CONTENT } from '../../lib/helpContent'

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatDateLong = (dateStr) => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: '2-digit' })
}

const formatTimestamp = () => {
  const d = new Date()
  return `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}_${d.getHours().toString().padStart(2,'0')}${d.getMinutes().toString().padStart(2,'0')}${d.getSeconds().toString().padStart(2,'0')}`
}

// Formatea cantidad eliminando ceros decimales innecesarios (1.000 → 1, 2.500 → 2.5)
const formatCantidad = (item) => {
  if (item.cantidad_numerica != null) {
    const n = parseFloat(item.cantidad_numerica)
    return Number.isInteger(n) ? n.toString() : n.toLocaleString('es-CO', { maximumFractionDigits: 2 })
  }
  return item.cantidad_texto || '-'
}

function VencimientoBadge({ fecha }) {
  if (!fecha) return null
  const diffDias = Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24))
  if (diffDias < 0) return React.createElement('span', { className: 'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700' }, 'Vencido')
  if (diffDias <= 30) return React.createElement('span', { className: 'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700' }, 'Vence pronto')
  return React.createElement('span', { className: 'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700' }, 'Vigente')
}

export default function Auditoria() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [resumen, setResumen] = useState({ totalProductos: 0, totalOrdenes: 0, tecnicoTop: null, productoTop: null })
  const [tecnicos, setTecnicos] = useState([])
  const [productosCat, setProductosCat] = useState([])
  const [clientes, setClientes] = useState([])
  const [filters, setFilters] = useState({ tecnico_id: '', producto_id: '', cliente_id: '', fecha_desde: '', fecha_hasta: '', tipo_registro: '' })

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const token = localStorage.getItem('token')
        const [resTecnicos, resProductos, resClientes] = await Promise.all([
          api.get('/profiles', { token }),
          api.get('/productos-catalogo', { token }),
          api.get('/clientes', { token })
        ])
        setTecnicos((resTecnicos.data || []).filter(p => p.rol === 'tecnico' || p.rol === 'admin'))
        setProductosCat(resProductos.data || [])
        setClientes(resClientes.data || [])
      } catch (err) {
        toast.error('Error al cargar opciones de filtro')
      }
    }
    loadOptions()
  }, [])

  const productosFiltrados = filters.tipo_registro === 'epp'
    ? productosCat.filter(p => p.categoria === 'epp')
    : filters.tipo_registro === 'aplicacion'
      ? productosCat.filter(p => p.categoria !== 'epp')
      : productosCat

  const fetchAuditoria = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => { if (value) queryParams.append(key, value) })
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
      const [resData, resSummary] = await Promise.all([
        api.get(`/productos-catalogo/auditoria${queryString}`, { token }),
        api.get(`/productos-catalogo/auditoria/resumen${queryString}`, { token })
      ])
      setData(resData.data || [])
      setResumen(resSummary.data || { totalProductos: 0, totalOrdenes: 0, tecnicoTop: null, productoTop: null })
    } catch (err) {
      toast.error('Error al cargar datos de auditoría')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchAuditoria() }, [fetchAuditoria])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    if (name === 'tipo_registro') {
      setFilters(prev => ({ ...prev, tipo_registro: value, producto_id: '', cliente_id: '' }))
    } else {
      setFilters(prev => ({ ...prev, [name]: value }))
    }
  }

  const clearFilters = () => setFilters({ tecnico_id: '', producto_id: '', cliente_id: '', fecha_desde: '', fecha_hasta: '', tipo_registro: '' })

  const exportToCSV = () => {
    if (data.length === 0) { toast.error('No hay datos para exportar'); return }
    const headers = ['Tipo', 'Fecha', 'Tecnico', 'Producto', 'Cantidad', 'Unidad', 'Orden/Ref', 'Destino', 'Estado']
    const rows = data.map(item => {
      const tipo = item.tipo_registro === 'epp' ? 'Dotacion EPP' : 'Aplicacion'
      const fecha = item.fecha_programada ? formatDate(item.fecha_programada) : 'N/A'
      const cant = formatCantidad(item)
      const unit = item.unidad || ''
      const ordenCod = item.tipo_registro === 'epp' ? 'ENTREGA EPP' : `#ORD-${(item.orden_id || '').split('-')[0].toUpperCase()}`
      return [tipo, fecha, `"${item.tecnico_nombre||'N/A'}"`, `"${item.catalogo_nombre||item.producto_nombre||'N/A'}"`, cant, `"${unit}"`, ordenCod, `"${item.cliente_razon_social||item.cliente_nombre||'Uso Interno'}"`, item.orden_estado].join(',')
    })
    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', `auditoria_${formatTimestamp()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-dark-50">
      <div className="bg-white border-b border-dark-100 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center shrink-0">
                <FileSearch className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-dark-900">Auditoría de Productos</h1>
                  <HelpButton title="Auditoría de Productos" content={HELP_CONTENT.productos} />
                </div>
                <p className="text-sm text-dark-500 mt-1">Rastreo de consumo y dotaciones EPP por técnicos y colaboradores</p>
              </div>
            </div>
            <button onClick={exportToCSV} className="btn-primary" disabled={data.length === 0}>
              <Download className="w-4 h-4" />Exportar CSV
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Package className="w-6 h-6" /></div>
              <div><p className="text-xs font-semibold text-dark-500 uppercase">Registros Totales</p><p className="text-2xl font-bold text-dark-900">{resumen.totalProductos}</p></div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Calendar className="w-6 h-6" /></div>
              <div><p className="text-xs font-semibold text-dark-500 uppercase">Órdenes / Eventos</p><p className="text-2xl font-bold text-dark-900">{resumen.totalOrdenes}</p></div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><User className="w-6 h-6" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-dark-500 uppercase truncate">Técnico Destacado</p>
                <p className="text-sm font-bold text-dark-900 truncate">{resumen.tecnicoTop?.nombre || 'N/A'}</p>
                <p className="text-xs text-dark-400">{resumen.tecnicoTop?.cantidad || 0} registros</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><FileSearch className="w-6 h-6" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-dark-500 uppercase truncate">Producto Más Frecuente</p>
                <p className="text-sm font-bold text-dark-900 truncate">{resumen.productoTop?.nombre || 'N/A'}</p>
                <p className="text-xs text-dark-400">{resumen.productoTop?.cantidad || 0} registros</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-dark-400" />
              <h2 className="text-base font-bold text-dark-900">Filtros de Búsqueda</h2>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {[{ value: '', label: 'Todos' }, { value: 'epp', label: '🛡️ Solo EPP' }, { value: 'aplicacion', label: '🧪 Solo Aplicaciones' }].map(opt => (
                <button key={opt.value}
                  onClick={() => handleFilterChange({ target: { name: 'tipo_registro', value: opt.value } })}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${filters.tipo_registro === opt.value ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'bg-white text-dark-600 border-dark-200 hover:border-primary-400'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="label-field text-xs">Técnico / Colaborador</label>
                <select name="tecnico_id" value={filters.tecnico_id} onChange={handleFilterChange} className="input-field py-2 text-sm">
                  <option value="">Todos</option>
                  {tecnicos.map(t => (<option key={t.id} value={t.id}>{t.nombre_completo}</option>))}
                </select>
              </div>
              <div>
                <label className="label-field text-xs">Producto {filters.tipo_registro === 'epp' ? '(EPP)' : ''}</label>
                <select name="producto_id" value={filters.producto_id} onChange={handleFilterChange} className="input-field py-2 text-sm">
                  <option value="">Todos los productos</option>
                  {productosFiltrados.map(p => (<option key={p.id} value={p.id}>{p.nombre_comercial}</option>))}
                </select>
              </div>
              {filters.tipo_registro !== 'epp' && (
                <div>
                  <label className="label-field text-xs">Cliente</label>
                  <select name="cliente_id" value={filters.cliente_id} onChange={handleFilterChange} className="input-field py-2 text-sm">
                    <option value="">Todos los clientes</option>
                    {clientes.map(c => (<option key={c.id} value={c.id}>{c.nombre_comercial || c.razon_social || c.nombre}</option>))}
                  </select>
                </div>
              )}
              <div>
                <label className="label-field text-xs">Desde Fecha</label>
                <input type="date" name="fecha_desde" value={filters.fecha_desde} onChange={handleFilterChange} className="input-field py-2 text-sm" />
              </div>
              <div>
                <label className="label-field text-xs">Hasta Fecha</label>
                <input type="date" name="fecha_hasta" value={filters.fecha_hasta} onChange={handleFilterChange} className="input-field py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={clearFilters} className="btn-ghost text-sm py-1.5">Limpiar filtros</button>
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="p-4 border-b border-dark-100 flex items-center justify-between bg-dark-50/50">
              <h3 className="font-bold text-dark-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-dark-400" />Resultados ({data.length})
              </h3>
              {data.length > 0 && <p className="text-xs text-dark-400">Haz clic en una fila para ver el detalle</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-dark-50/80">
                    <th className="p-3 text-xs font-semibold text-dark-500 uppercase tracking-wider border-y border-dark-100">Tipo</th>
                    <th className="p-3 text-xs font-semibold text-dark-500 uppercase tracking-wider border-y border-dark-100">Fecha</th>
                    <th className="p-3 text-xs font-semibold text-dark-500 uppercase tracking-wider border-y border-dark-100">Técnico</th>
                    <th className="p-3 text-xs font-semibold text-dark-500 uppercase tracking-wider border-y border-dark-100">Producto</th>
                    <th className="p-3 text-xs font-semibold text-dark-500 uppercase tracking-wider border-y border-dark-100">Cantidad</th>
                    <th className="p-3 text-xs font-semibold text-dark-500 uppercase tracking-wider border-y border-dark-100">Destino / Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {loading ? (
                    <tr><td colSpan="6" className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" /><p className="text-sm text-dark-500">Cargando datos...</p></td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center"><FileSearch className="w-10 h-10 text-dark-300 mx-auto mb-3" /><p className="text-sm font-semibold text-dark-600">No hay registros</p><p className="text-xs text-dark-400 mt-1">Prueba cambiando los filtros de búsqueda</p></td></tr>
                  ) : (
                    data.map(item => (
                      <tr key={item.id} onClick={() => setSelectedItem(item)} className="hover:bg-primary-50/40 transition-colors cursor-pointer group">
                        <td className="p-3">
                          {item.tipo_registro === 'epp' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                              <ShieldCheck className="w-3 h-3" /> EPP
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-primary-100 text-primary-700 border border-primary-200">
                              <Package className="w-3 h-3" /> Aplicación
                            </span>
                          )}
                        </td>
                        <td className="p-3"><p className="text-sm font-medium text-dark-900">{item.fecha_programada ? formatDate(item.fecha_programada) : '-'}</p></td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-dark-100 flex items-center justify-center shrink-0"><User className="w-3 h-3 text-dark-500" /></div>
                            <span className="text-sm font-medium text-dark-900">{item.tecnico_nombre || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-3"><p className="text-sm font-bold text-dark-900 group-hover:text-primary-700 transition-colors">{item.catalogo_nombre || item.producto_nombre || 'N/A'}</p></td>
                        <td className="p-3">
                          <p className="text-sm font-semibold text-primary-700 bg-primary-50 inline-block px-2 py-0.5 rounded-md">
                            {formatCantidad(item)}{item.unidad ? ` ${item.unidad}` : ''}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="text-xs text-dark-500 truncate max-w-[180px] mb-1">
                            {item.tipo_registro === 'epp' ? 'Uso Interno' : (item.cliente_razon_social || item.cliente_nombre || 'Sin cliente')}
                          </p>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${item.orden_estado === 'completada' ? 'bg-green-100 text-green-700' : item.orden_estado === 'entregado' ? 'bg-violet-100 text-violet-700' : item.orden_estado === 'en_progreso' ? 'bg-blue-100 text-blue-700' : 'bg-dark-100 text-dark-600'}`}>
                            {item.orden_estado || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full sm:rounded-2xl max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-dark-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedItem.tipo_registro === 'epp' ? 'bg-violet-100 text-violet-600' : 'bg-primary-100 text-primary-600'}`}>
                  {selectedItem.tipo_registro === 'epp' ? <ShieldCheck className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-dark-900">{selectedItem.tipo_registro === 'epp' ? 'Detalle Dotación EPP' : 'Detalle Aplicación'}</h2>
                  <p className="text-xs text-dark-500">{formatDateLong(selectedItem.fecha_programada)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 text-dark-400 hover:text-dark-600 bg-dark-50 hover:bg-dark-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <h3 className="text-xl font-black text-dark-900">{selectedItem.catalogo_nombre || selectedItem.producto_nombre || 'N/A'}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-dark-50 p-3 rounded-xl border border-dark-100">
                  <p className="text-xs font-semibold text-dark-500 mb-1">Técnico / Colaborador</p>
                  <p className="font-bold text-dark-900 text-sm">{selectedItem.tecnico_nombre || 'N/A'}</p>
                </div>
                <div className="bg-dark-50 p-3 rounded-xl border border-dark-100">
                  <p className="text-xs font-semibold text-dark-500 mb-1">Cantidad</p>
                  <p className="font-bold text-dark-900 text-sm">{formatCantidad(selectedItem)}{selectedItem.unidad ? ` ${selectedItem.unidad}` : ''}</p>
                </div>
                <div className="bg-dark-50 p-3 rounded-xl border border-dark-100">
                  <p className="text-xs font-semibold text-dark-500 mb-1">Fecha</p>
                  <p className="font-bold text-dark-900 text-sm">{formatDate(selectedItem.fecha_programada)}</p>
                </div>
                <div className="bg-dark-50 p-3 rounded-xl border border-dark-100">
                  <p className="text-xs font-semibold text-dark-500 mb-1">{selectedItem.tipo_registro === 'epp' ? 'Tipo' : 'Cliente'}</p>
                  <p className="font-bold text-dark-900 text-sm truncate">{selectedItem.tipo_registro === 'epp' ? 'Dotación Interna EPP' : (selectedItem.cliente_razon_social || selectedItem.cliente_nombre || 'N/A')}</p>
                </div>
              </div>

              {selectedItem.tipo_registro === 'epp' && (
                <div className="space-y-3">
                  {selectedItem.codigo_activo && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center"><Tag className="w-4 h-4" /></div>
                      <div><p className="text-xs font-medium text-dark-500">Código de Activo</p><p className="font-bold text-dark-900 text-sm">{selectedItem.codigo_activo}</p></div>
                    </div>
                  )}
                  {selectedItem.lote && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center"><Package2 className="w-4 h-4" /></div>
                      <div><p className="text-xs font-medium text-dark-500">Lote</p><p className="font-bold text-dark-900 text-sm">{selectedItem.lote}</p></div>
                    </div>
                  )}
                  {(selectedItem.marca || selectedItem.modelo) && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center"><ShieldCheck className="w-4 h-4" /></div>
                      <div><p className="text-xs font-medium text-dark-500">Marca / Modelo</p><p className="font-bold text-dark-900 text-sm">{[selectedItem.marca, selectedItem.modelo].filter(Boolean).join(' - ')}</p></div>
                    </div>
                  )}
                  {selectedItem.fecha_vencimiento && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center"><Calendar className="w-4 h-4" /></div>
                      <div><p className="text-xs font-medium text-dark-500">Vencimiento</p><p className="font-bold text-dark-900 text-sm">{formatDateLong(selectedItem.fecha_vencimiento)}</p></div>
                    </div>
                  )}
                  {selectedItem.notas && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">Notas de Asignación</p>
                      <p className="text-sm text-amber-800 whitespace-pre-wrap">{selectedItem.notas}</p>
                    </div>
                  )}
                  {selectedItem.ficha_seguridad_url && (
                    <a href={selectedItem.ficha_seguridad_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-violet-50 text-sm font-bold text-violet-700 hover:bg-violet-100 transition-colors">
                      <AlertCircle className="w-4 h-4" /> Ver ficha de seguridad
                    </a>
                  )}
                </div>
              )}

              {selectedItem.tipo_registro !== 'epp' && (
                <div className="bg-dark-50 p-3 rounded-xl border border-dark-100">
                  <p className="text-xs font-semibold text-dark-500 mb-1">Orden de Servicio</p>
                  <p className="font-bold text-primary-700 text-sm">#ORD-{(selectedItem.orden_id || '').split('-')[0].toUpperCase()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
