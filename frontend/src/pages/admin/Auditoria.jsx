import { useState, useEffect, useCallback } from 'react'
import { FileSearch, Search, Filter, Download, User, Package, Users, Calendar, Loader2 } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function Auditoria() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [resumen, setResumen] = useState({
    totalProductos: 0,
    totalOrdenes: 0,
    tecnicoTop: null,
    productoTop: null
  })
  
  // Options for filters
  const [tecnicos, setTecnicos] = useState([])
  const [productosCat, setProductosCat] = useState([])
  const [clientes, setClientes] = useState([])

  // Filters state
  const [filters, setFilters] = useState({
    tecnico_id: '',
    producto_id: '',
    cliente_id: '',
    fecha_desde: '',
    fecha_hasta: ''
  })

  // Load initial data (dropdown options)
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const token = localStorage.getItem('token')
        const [resTecnicos, resProductos, resClientes] = await Promise.all([
          api.get('/profiles', { token }),
          api.get('/productos-catalogo', { token }),
          api.get('/clientes', { token })
        ])
        
        // Filter out only tecnicos
        setTecnicos((resTecnicos.data || []).filter(p => p.rol === 'tecnico' || p.rol === 'admin'))
        setProductosCat(resProductos.data || [])
        setClientes(resClientes.data || [])
      } catch (err) {
        console.error('Error loading options:', err)
        toast.error('Error al cargar opciones de filtro')
      }
    }
    loadOptions()
  }, [])

  // Fetch audit data based on filters
  const fetchAuditoria = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      // Build query string
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value)
      })
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
      
      const [resData, resSummary] = await Promise.all([
        api.get(`/productos-catalogo/auditoria${queryString}`, { token }),
        api.get(`/productos-catalogo/auditoria/resumen${queryString}`, { token })
      ])
      
      setData(resData.data || [])
      setResumen(resSummary.data || {
        totalProductos: 0, totalOrdenes: 0, tecnicoTop: null, productoTop: null
      })
    } catch (err) {
      console.error('Error fetching auditoria:', err)
      toast.error('Error al cargar datos de auditoría')
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Fetch on initial render and when manually triggered (or just manually)
  useEffect(() => {
    fetchAuditoria()
  }, [fetchAuditoria])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const clearFilters = () => {
    setFilters({
      tecnico_id: '',
      producto_id: '',
      cliente_id: '',
      fecha_desde: '',
      fecha_hasta: ''
    })
  }

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error('No hay datos para exportar')
      return
    }

    // Prepare CSV headers
    const headers = ['Fecha', 'Técnico', 'Producto', 'Cantidad', 'Unidad', 'Orden', 'Cliente', 'Estado']
    
    // Convert data to CSV rows
    const rows = data.map(item => {
      const fecha = item.fecha_programada ? format(new Date(item.fecha_programada), 'dd/MM/yyyy') : 'N/A'
      const cant = item.cantidad_numerica != null ? item.cantidad_numerica : item.cantidad_texto || '0'
      const unit = item.unidad || ''
      const ordenCod = `#ORD-${(item.orden_id || '').split('-')[0].toUpperCase()}`
      
      return [
        fecha,
        `"${item.tecnico_nombre || 'N/A'}"`,
        `"${item.catalogo_nombre || item.producto_nombre || 'N/A'}"`,
        cant,
        `"${unit}"`,
        ordenCod,
        `"${item.cliente_razon_social || item.cliente_nombre || 'N/A'}"`,
        item.orden_estado
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `auditoria_productos_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-dark-50">
      {/* Header */}
      <div className="bg-white border-b border-dark-100 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center shrink-0">
                <FileSearch className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dark-900">Auditoría de Productos</h1>
                <p className="text-sm text-dark-500 mt-1">Rastreo de consumo por técnicos y clientes</p>
              </div>
            </div>
            
            <button
              onClick={exportToCSV}
              className="btn-primary"
              disabled={data.length === 0}
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-dark-500 uppercase">Aplicaciones Totales</p>
                <p className="text-2xl font-bold text-dark-900">{resumen.totalProductos}</p>
              </div>
            </div>
            
            <div className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-dark-500 uppercase">Órdenes Afectadas</p>
                <p className="text-2xl font-bold text-dark-900">{resumen.totalOrdenes}</p>
              </div>
            </div>
            
            <div className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-dark-500 uppercase truncate">Técnico Destacado</p>
                <p className="text-sm font-bold text-dark-900 truncate" title={resumen.tecnicoTop?.nombre || 'N/A'}>
                  {resumen.tecnicoTop?.nombre || 'N/A'}
                </p>
                <p className="text-xs text-dark-400">{resumen.tecnicoTop?.cantidad || 0} aplicaciones</p>
              </div>
            </div>
            
            <div className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <FileSearch className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-dark-500 uppercase truncate">Producto Más Usado</p>
                <p className="text-sm font-bold text-dark-900 truncate" title={resumen.productoTop?.nombre || 'N/A'}>
                  {resumen.productoTop?.nombre || 'N/A'}
                </p>
                <p className="text-xs text-dark-400">{resumen.productoTop?.cantidad || 0} aplicaciones</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-dark-400" />
              <h2 className="text-base font-bold text-dark-900">Filtros de Búsqueda</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="label-field text-xs">Técnico</label>
                <select
                  name="tecnico_id"
                  value={filters.tecnico_id}
                  onChange={handleFilterChange}
                  className="input-field py-2 text-sm"
                >
                  <option value="">Todos los técnicos</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="label-field text-xs">Producto</label>
                <select
                  name="producto_id"
                  value={filters.producto_id}
                  onChange={handleFilterChange}
                  className="input-field py-2 text-sm"
                >
                  <option value="">Todos los productos</option>
                  {productosCat.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre_comercial}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="label-field text-xs">Cliente</label>
                <select
                  name="cliente_id"
                  value={filters.cliente_id}
                  onChange={handleFilterChange}
                  className="input-field py-2 text-sm"
                >
                  <option value="">Todos los clientes</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre_comercial || c.razon_social || c.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="label-field text-xs">Desde Fecha</label>
                <input
                  type="date"
                  name="fecha_desde"
                  value={filters.fecha_desde}
                  onChange={handleFilterChange}
                  className="input-field py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="label-field text-xs">Hasta Fecha</label>
                <input
                  type="date"
                  name="fecha_hasta"
                  value={filters.fecha_hasta}
                  onChange={handleFilterChange}
                  className="input-field py-2 text-sm"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={clearFilters} className="btn-ghost text-sm py-1.5">
                Limpiar
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="card overflow-hidden p-0">
            <div className="p-4 border-b border-dark-100 flex items-center justify-between bg-dark-50/50">
              <h3 className="font-bold text-dark-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-dark-400" />
                Resultados ({data.length})
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-dark-50/80">
                    <th className="p-3 text-xs font-semibold text-dark-500 uppercase tracking-wider border-y border-dark-100">Fecha</th>
                    <th className="p-3 text-xs font-semibold text-dark-500 uppercase tracking-wider border-y border-dark-100">Técnico</th>
                    <th className="p-3 text-xs font-semibold text-dark-500 uppercase tracking-wider border-y border-dark-100">Producto</th>
                    <th className="p-3 text-xs font-semibold text-dark-500 uppercase tracking-wider border-y border-dark-100">Cantidad</th>
                    <th className="p-3 text-xs font-semibold text-dark-500 uppercase tracking-wider border-y border-dark-100">Orden / Cliente</th>
                    <th className="p-3 text-xs font-semibold text-dark-500 uppercase tracking-wider border-y border-dark-100">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
                        <p className="text-sm text-dark-500">Cargando datos...</p>
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center">
                        <FileSearch className="w-10 h-10 text-dark-300 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-dark-600">No hay registros</p>
                        <p className="text-xs text-dark-400 mt-1">Prueba cambiando los filtros de búsqueda</p>
                      </td>
                    </tr>
                  ) : (
                    data.map(item => (
                      <tr key={item.id} className="hover:bg-primary-50/30 transition-colors">
                        <td className="p-3">
                          <p className="text-sm font-medium text-dark-900">
                            {item.fecha_programada ? format(new Date(item.fecha_programada), 'dd/MM/yyyy') : '-'}
                          </p>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-dark-100 flex items-center justify-center shrink-0">
                              <User className="w-3 h-3 text-dark-500" />
                            </div>
                            <span className="text-sm font-medium text-dark-900">{item.tecnico_nombre || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="text-sm font-bold text-dark-900">{item.catalogo_nombre || item.producto_nombre || 'N/A'}</p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm font-semibold text-primary-700 bg-primary-50 inline-block px-2 py-0.5 rounded-md">
                            {item.cantidad_numerica != null ? item.cantidad_numerica : item.cantidad_texto || '-'} 
                            {item.unidad ? ` ${item.unidad}` : ''}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="text-xs font-bold text-primary-600">
                            #ORD-{(item.orden_id || '').split('-')[0].toUpperCase()}
                          </p>
                          <p className="text-xs text-dark-500 truncate max-w-[200px]" title={item.cliente_razon_social || item.cliente_nombre}>
                            {item.cliente_razon_social || item.cliente_nombre || 'Sin cliente'}
                          </p>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                            item.orden_estado === 'completada' ? 'bg-green-100 text-green-700' :
                            item.orden_estado === 'en_progreso' ? 'bg-blue-100 text-blue-700' :
                            'bg-dark-100 text-dark-600'
                          }`}>
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
    </div>
  )
}
