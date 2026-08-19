import { useState, useEffect } from 'react'
import {
  Package, Plus, Search, Edit2, Trash2, X, Loader2,
  TrendingUp, History, AlertTriangle, ChevronDown, ChevronUp,
  ArrowDownCircle, ArrowUpCircle, BarChart2, UserCheck, Tag
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { confirmDelete } from '../../lib/alerts'
import HelpButton from '../../components/features/HelpButton'
import { HELP_CONTENT } from '../../lib/helpContent'

const CATEGORIAS = [
  { value: 'liquido', label: 'Líquido concentrado' },
  { value: 'granulado', label: 'Granulado / Polvo' },
  { value: 'gel', label: 'Gel / Cebo' },
  { value: 'trampa', label: 'Trampa / Dispositivo' },
  { value: 'equipo', label: 'Equipo' },
  { value: 'epp', label: 'EPP (Protección Personal)' },
  { value: 'otro', label: 'Otro' }
]

const UNIDADES = [
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (L)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'unidad', label: 'Unidades' }
]

function StockBadge({ stock, minimo }) {
  if (stock === null || stock === undefined) return null
  const s = parseFloat(stock)
  const m = parseFloat(minimo || 0)
  if (s === 0) return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Sin stock</span>
  if (m > 0 && s <= m) return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Stock bajo</span>
  return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />En stock</span>
}

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStockBajo, setFilterStockBajo] = useState(false)
  const [activeTab, setActiveTab] = useState('quimicos') // 'quimicos' | 'equipos_epp'

  // Modal: Crear / Editar
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
    nombre_comercial: '',
    ingrediente_activo: '',
    dosis_recomendada: '',
    tipo_producto: '',
    estado: 'activo',
    categoria: 'otro',
    unidad_base: 'unidad',
    stock_actual: '',
    stock_minimo: '',
    presentacion_compra: '',
    factor_conversion: '1'
  })

  // Modal: Reabastecer
  const [showReabModal, setShowReabModal] = useState(false)
  const [reabProducto, setReabProducto] = useState(null)
  const [reabForm, setReabForm] = useState({ cantidad_presentaciones: '', notas: '' })
  const [isReabasteciendo, setIsReabasteciendo] = useState(false)

  // Panel: Historial de movimientos
  const [historialProducto, setHistorialProducto] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [loadingMovimientos, setLoadingMovimientos] = useState(false)
  const [showHistorial, setShowHistorial] = useState(false)

  // Modal: Ajuste manual
  const [showAjusteModal, setShowAjusteModal] = useState(false)
  const [ajusteProducto, setAjusteProducto] = useState(null)
  const [ajusteForm, setAjusteForm] = useState({ nuevo_stock: '', notas: '' })
  const [isAjustando, setIsAjustando] = useState(false)

  // Modal: Asignar a Técnico (solo EPP)
  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [asignarProducto, setAsignarProducto] = useState(null)
  const [asignarForm, setAsignarForm] = useState({ tecnico_id: '', cantidad: '', notas: '' })
  const [isAsignando, setIsAsignando] = useState(false)

  // Modal: Gestión de Activos (Seriales)
  const [showActivosModal, setShowActivosModal] = useState(false)
  const [activosProducto, setActivosProducto] = useState(null)
  const [activosList, setActivosList] = useState([])
  const [loadingActivos, setLoadingActivos] = useState(false)
  const [nuevoActivo, setNuevoActivo] = useState({
    codigo_activo: '', nombre: '', marca: '', modelo: '', numero_serie: '', estado: 'disponible', notas: ''
  })
  const [isAgregandoActivo, setIsAgregandoActivo] = useState(false)

  const loadProductos = async () => {
    try {
      const token = localStorage.getItem('token')
      const { data } = await api.get('/productos-catalogo', { token })
      setProductos(data || [])
    } catch {
      toast.error('Error cargando el catálogo de productos')
    } finally {
      setLoading(false)
    }
  }

  const loadTecnicos = async () => {
    try {
      const token = localStorage.getItem('token')
      const { data } = await api.get('/profiles', { token, params: { rol: 'tecnico', activo: true } })
      setTecnicos(data || [])
    } catch (err) {
      console.error('Error cargando técnicos', err)
    }
  }

  useEffect(() => { loadProductos(); loadTecnicos(); }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    const token = localStorage.getItem('token')
    try {
      const payload = {
        ...formData,
        stock_actual: formData.stock_actual !== '' ? parseFloat(formData.stock_actual) : 0,
        stock_minimo: formData.stock_minimo !== '' ? parseFloat(formData.stock_minimo) : 0,
        factor_conversion: formData.factor_conversion !== '' ? parseFloat(formData.factor_conversion) : 1
      }
      if (formData.id) {
        await api.put(`/productos-catalogo/${formData.id}`, payload, { token })
        toast.success('Producto actualizado')
      } else {
        await api.post('/productos-catalogo', payload, { token })
        toast.success('Producto creado')
      }
      setShowModal(false)
      loadProductos()
    } catch {
      toast.error('Error al guardar el producto')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const isConfirmed = await confirmDelete('¿Eliminar producto?', 'No se podrá usar en nuevas órdenes, pero se mantendrá en las históricas.')
    if (!isConfirmed) return
    try {
      const token = localStorage.getItem('token')
      await api.delete(`/productos-catalogo/${id}`, { token })
      toast.success('Producto eliminado')
      loadProductos()
    } catch {
      toast.error('Error al eliminar producto')
    }
  }

  const openModal = (prod = null) => {
    if (prod) {
      setFormData({
        id: prod.id,
        nombre_comercial: prod.nombre_comercial || '',
        ingrediente_activo: prod.ingrediente_activo || '',
        dosis_recomendada: prod.dosis_recomendada || '',
        tipo_producto: prod.tipo_producto || '',
        estado: prod.estado || 'activo',
        categoria: prod.categoria || 'otro',
        unidad_base: prod.unidad_base || 'unidad',
        stock_actual: prod.stock_actual ?? '',
        stock_minimo: prod.stock_minimo ?? '',
        presentacion_compra: prod.presentacion_compra || '',
        factor_conversion: prod.factor_conversion ?? '1'
      })
    } else {
      setFormData({
        id: null, nombre_comercial: '', ingrediente_activo: '', dosis_recomendada: '',
        tipo_producto: '', estado: 'activo', categoria: 'otro', unidad_base: 'unidad',
        stock_actual: '', stock_minimo: '', presentacion_compra: '', factor_conversion: '1'
      })
    }
    setShowModal(true)
  }

  // ── Reabastecer ──────────────────────────────────────────────────────────────
  const openReabastecer = (prod) => {
    setReabProducto(prod)
    setReabForm({ cantidad_presentaciones: '', notas: '' })
    setShowReabModal(true)
  }

  const handleReabastecer = async (e) => {
    e.preventDefault()
    if (!reabForm.cantidad_presentaciones || parseFloat(reabForm.cantidad_presentaciones) <= 0) {
      return toast.error('Ingresa una cantidad válida')
    }
    setIsReabasteciendo(true)
    try {
      const token = localStorage.getItem('token')
      const { data } = await api.post(
        `/productos-catalogo/${reabProducto.id}/reabastecer`,
        { cantidad_presentaciones: parseFloat(reabForm.cantidad_presentaciones), notas: reabForm.notas },
        { token }
      )
      const { delta, unidad_base } = data
      toast.success(`✅ +${delta} ${unidad_base} agregados al stock`)
      setShowReabModal(false)
      loadProductos()
    } catch {
      toast.error('Error al reabastecer stock')
    } finally {
      setIsReabasteciendo(false)
    }
  }

  // ── Ajuste manual ────────────────────────────────────────────────────────────
  const openAjuste = (prod) => {
    setAjusteProducto(prod)
    setAjusteForm({ nuevo_stock: prod.stock_actual ?? '', notas: '' })
    setShowAjusteModal(true)
  }

  const handleAjuste = async (e) => {
    e.preventDefault()
    if (ajusteForm.nuevo_stock === '' || parseFloat(ajusteForm.nuevo_stock) < 0) {
      return toast.error('El stock debe ser mayor o igual a 0')
    }
    setIsAjustando(true)
    try {
      const token = localStorage.getItem('token')
      await api.post(
        `/productos-catalogo/${ajusteProducto.id}/ajuste`,
        { nuevo_stock: parseFloat(ajusteForm.nuevo_stock), notas: ajusteForm.notas },
        { token }
      )
      toast.success('Stock ajustado correctamente')
      setShowAjusteModal(false)
      loadProductos()
    } catch {
      toast.error('Error al ajustar stock')
    } finally {
      setIsAjustando(false)
    }
  }

  // ── Asignar a Técnico ────────────────────────────────────────────────────────
  const openAsignar = (prod) => {
    setAsignarProducto(prod)
    setAsignarForm({ tecnico_id: '', cantidad: '', notas: '' })
    setShowAsignarModal(true)
  }

  const handleAsignar = async (e) => {
    e.preventDefault()
    if (!asignarForm.tecnico_id || !asignarForm.cantidad || parseFloat(asignarForm.cantidad) <= 0) {
      return toast.error('Selecciona un técnico y una cantidad válida')
    }
    setIsAsignando(true)
    try {
      const token = localStorage.getItem('token')
      await api.post(
        `/productos-catalogo/${asignarProducto.id}/asignar`,
        { tecnico_id: asignarForm.tecnico_id, cantidad: parseFloat(asignarForm.cantidad), notas: asignarForm.notas },
        { token }
      )
      toast.success('Dotación asignada correctamente')
      setShowAsignarModal(false)
      loadProductos()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al asignar dotación')
    } finally {
      setIsAsignando(false)
    }
  }

  // ── Historial ────────────────────────────────────────────────────────────────
  const openHistorial = async (prod) => {
    setHistorialProducto(prod)
    setShowHistorial(true)
    setLoadingMovimientos(true)
    try {
      const token = localStorage.getItem('token')
      const { data } = await api.get(`/productos-catalogo/${prod.id}/movimientos`, { token })
      setMovimientos(data || [])
    } catch {
      toast.error('Error cargando historial')
    } finally {
      setLoadingMovimientos(false)
    }
  }

  // ── Gestión de Activos ────────────────────────────────────────────────────────
  const openActivos = async (prod) => {
    setActivosProducto(prod)
    setShowActivosModal(true)
    loadActivos(prod.id)
  }

  const loadActivos = async (productoId) => {
    setLoadingActivos(true)
    try {
      const token = localStorage.getItem('token')
      const { data } = await api.get(`/productos-catalogo/${productoId}/activos`, { token })
      setActivosList(data || [])
    } catch {
      toast.error('Error cargando los activos fijos')
    } finally {
      setLoadingActivos(false)
    }
  }

  const handleAddActivo = async (e) => {
    e.preventDefault()
    if (!nuevoActivo.codigo_activo.trim()) return toast.error('Ingresa un código o serial de activo')
    setIsAgregandoActivo(true)
    try {
      const token = localStorage.getItem('token')
      await api.post(
        `/productos-catalogo/${activosProducto.id}/activos`,
        nuevoActivo,
        { token }
      )
      toast.success('Activo registrado')
      setNuevoActivo({
        codigo_activo: '', nombre: '', marca: '', modelo: '', numero_serie: '', estado: 'disponible', notas: ''
      })
      loadActivos(activosProducto.id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar activo (¿código duplicado?)')
    } finally {
      setIsAgregandoActivo(false)
    }
  }

  const handleDeleteActivo = async (activoId) => {
    const isConfirmed = await confirmDelete('¿Eliminar activo?', 'Solo se pueden eliminar activos que no estén prestados.')
    if (!isConfirmed) return
    try {
      const token = localStorage.getItem('token')
      await api.delete(`/productos-catalogo/activos/${activoId}`, { token })
      toast.success('Activo eliminado')
      loadActivos(activosProducto.id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar activo')
    }
  }

  const filtered = productos.filter(p => {
    const isEquipamiento = p.categoria === 'epp' || p.categoria === 'equipo'
    const matchTab = activeTab === 'quimicos' ? !isEquipamiento : isEquipamiento
    
    const matchSearch = p.nombre_comercial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.ingrediente_activo || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchStock = !filterStockBajo || (parseFloat(p.stock_actual || 0) <= parseFloat(p.stock_minimo || 0) && parseFloat(p.stock_minimo || 0) > 0) || parseFloat(p.stock_actual || 0) === 0
    return matchTab && matchSearch && matchStock
  })

  const stockBajoCount = productos.filter(p =>
    (parseFloat(p.stock_actual || 0) <= parseFloat(p.stock_minimo || 0) && parseFloat(p.stock_minimo || 0) > 0) ||
    parseFloat(p.stock_actual || 0) === 0
  ).length

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-dark-900">Catálogo e Inventario</h1>
            <HelpButton title="Catálogo e Inventario" content={HELP_CONTENT.productos} />
          </div>
          <p className="text-dark-500">Gestione productos, stock y reabastecimiento</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      {/* Alerta de stock bajo */}
      {stockBajoCount > 0 && (
        <div
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => setFilterStockBajo(!filterStockBajo)}
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">
              {stockBajoCount} producto{stockBajoCount > 1 ? 's' : ''} con stock bajo o agotado
            </p>
            <p className="text-xs text-amber-600">Haz clic para {filterStockBajo ? 'ver todos' : 'filtrar solo estos'}</p>
          </div>
          {filterStockBajo ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
        </div>
      )}

      {/* Tabla principal */}
      <div className="card">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-dark-100 pb-4">
          <button
            onClick={() => setActiveTab('quimicos')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'quimicos'
                ? 'bg-primary-50 text-primary-700'
                : 'text-dark-500 hover:bg-dark-50'
            }`}
          >
            Productos Químicos
          </button>
          <button
            onClick={() => setActiveTab('equipos_epp')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'equipos_epp'
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-dark-500 hover:bg-dark-50'
            }`}
          >
            Equipos y Dotación (EPP)
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o ingrediente activo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-200">
                <th className="py-3 px-4 text-xs font-bold text-dark-500 uppercase">Producto</th>
                <th className="py-3 px-4 text-xs font-bold text-dark-500 uppercase">Categoría</th>
                <th className="py-3 px-4 text-xs font-bold text-dark-500 uppercase">Stock Actual</th>
                <th className="py-3 px-4 text-xs font-bold text-dark-500 uppercase">Mín.</th>
                <th className="py-3 px-4 text-xs font-bold text-dark-500 uppercase">Estado</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-dark-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-dark-100 hover:bg-dark-50/50">
                  <td className="py-3 px-4">
                    <div className="font-bold text-dark-900">{p.nombre_comercial}</div>
                    {p.ingrediente_activo && <div className="text-xs text-dark-400">{p.ingrediente_activo}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full font-bold capitalize">
                      {CATEGORIAS.find(c => c.value === p.categoria)?.label || p.categoria || 'Otro'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-dark-900">
                        {parseFloat(p.stock_actual || 0).toLocaleString()} {p.unidad_base}
                      </span>
                      <StockBadge stock={p.stock_actual} minimo={p.stock_minimo} />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-dark-500">
                    {p.stock_minimo ? `${parseFloat(p.stock_minimo).toLocaleString()} ${p.unidad_base}` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${p.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      {p.categoria === 'equipo' && (
                        <button
                          onClick={() => openActivos(p)}
                          title="Gestionar seriales/activos"
                          className="p-1.5 text-dark-400 hover:text-orange-600 transition-colors"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
                      )}
                      {['epp', 'equipo'].includes(p.categoria) && (
                        <button
                          onClick={() => openAsignar(p)}
                          title="Asignar a técnico"
                          className="p-1.5 text-dark-400 hover:text-indigo-600 transition-colors"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openReabastecer(p)}
                        title="Reabastecer stock"
                        className="p-1.5 text-dark-400 hover:text-green-600 transition-colors"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openAjuste(p)}
                        title="Ajuste manual de stock"
                        className="p-1.5 text-dark-400 hover:text-blue-600 transition-colors"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openHistorial(p)}
                        title="Ver historial de movimientos"
                        className="p-1.5 text-dark-400 hover:text-primary-600 transition-colors"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal(p)}
                        title="Editar"
                        className="p-1.5 text-dark-400 hover:text-primary-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        title="Eliminar"
                        className="p-1.5 text-dark-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-dark-500">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No se encontraron productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Crear / Editar Producto ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-dark-100">
              <h2 className="text-xl font-bold text-dark-900">
                {formData.id ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-dark-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Nombre comercial */}
              <div>
                <label className="label-field">Nombre Comercial *</label>
                <input type="text" required value={formData.nombre_comercial}
                  onChange={e => setFormData({ ...formData, nombre_comercial: e.target.value })}
                  className="input-field" placeholder="Ej: Ficam W" />
              </div>

              {/* Ingrediente activo + tipo (solo para químicos) */}
              {!['epp', 'equipo'].includes(formData.categoria) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Ingrediente Activo</label>
                    <input type="text" value={formData.ingrediente_activo}
                      onChange={e => setFormData({ ...formData, ingrediente_activo: e.target.value })}
                      className="input-field" placeholder="Ej: Bendiocarb" />
                  </div>
                  <div>
                    <label className="label-field">Tipo de Producto</label>
                    <input type="text" value={formData.tipo_producto}
                      onChange={e => setFormData({ ...formData, tipo_producto: e.target.value })}
                      className="input-field" placeholder="Ej: Insecticida" />
                  </div>
                </div>
              )}

              {/* Categoría + Unidad base */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Categoría</label>
                  <select value={formData.categoria}
                    onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                    className="input-field">
                    {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-field">Unidad Base de Stock</label>
                  <select value={formData.unidad_base}
                    onChange={e => setFormData({ ...formData, unidad_base: e.target.value })}
                    className="input-field">
                    {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Dosis recomendada (solo para químicos) */}
              {!['epp', 'equipo'].includes(formData.categoria) && (
                <div>
                  <label className="label-field">Dosis Recomendada</label>
                  <input type="text" value={formData.dosis_recomendada}
                    onChange={e => setFormData({ ...formData, dosis_recomendada: e.target.value })}
                    className="input-field" placeholder="Ej: 15g / Litro de agua" />
                </div>
              )}

              {/* Stock */}
              {formData.id ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Stock Actual ({formData.unidad_base})</label>
                    <div className="input-field bg-dark-50 text-dark-500 cursor-default flex items-center justify-between">
                      <span className="font-bold">{parseFloat(formData.stock_actual || 0).toLocaleString()}</span>
                      <span className="text-xs text-dark-400">Usa "Ajuste Manual" para modificar</span>
                    </div>
                  </div>
                  <div>
                    <label className="label-field">Stock Mínimo ({formData.unidad_base})</label>
                    <input type="number" min="0" step="0.001"
                      value={formData.stock_minimo}
                      onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })}
                      className="input-field" placeholder="0" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Stock Inicial ({formData.unidad_base})</label>
                    <input type="number" min="0" step="0.001"
                      value={formData.stock_actual}
                      onChange={e => setFormData({ ...formData, stock_actual: e.target.value })}
                      className="input-field" placeholder="0" />
                  </div>
                  <div>
                    <label className="label-field">Stock Mínimo ({formData.unidad_base})</label>
                    <input type="number" min="0" step="0.001"
                      value={formData.stock_minimo}
                      onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })}
                      className="input-field" placeholder="0" />
                  </div>
                </div>
              )}

              {/* Presentación de compra */}
              <div className="p-4 bg-dark-50 rounded-xl border border-dark-200 space-y-3">
                <p className="text-xs font-bold text-dark-500 uppercase tracking-wider">Presentación de Compra</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Descripción</label>
                    <input type="text" value={formData.presentacion_compra}
                      onChange={e => setFormData({ ...formData, presentacion_compra: e.target.value })}
                      className="input-field" placeholder="Ej: Galón 3785ml" />
                  </div>
                  <div>
                    <label className="label-field">
                      {formData.unidad_base}/presentación
                    </label>
                    <input type="number" min="0.001" step="0.001"
                      value={formData.factor_conversion}
                      onChange={e => setFormData({ ...formData, factor_conversion: e.target.value })}
                      className="input-field" placeholder="Ej: 3785" />
                  </div>
                </div>
                {formData.presentacion_compra && formData.factor_conversion && (
                  <p className="text-xs text-dark-500">
                    💡 1 {formData.presentacion_compra} = <strong>{parseFloat(formData.factor_conversion).toLocaleString()} {formData.unidad_base}</strong>
                  </p>
                )}
              </div>

              {/* Estado */}
              <div>
                <label className="label-field">Estado</label>
                <select value={formData.estado}
                  onChange={e => setFormData({ ...formData, estado: e.target.value })}
                  className="input-field">
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" disabled={isSaving} className="btn-primary flex-1 py-2">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (formData.id ? 'Guardar Cambios' : 'Crear Producto')}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary py-2">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Reabastecer ── */}
      {showReabModal && reabProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-dark-100">
              <div>
                <h2 className="text-xl font-bold text-dark-900">Reabastecer Stock</h2>
                <p className="text-sm text-dark-500">{reabProducto.nombre_comercial}</p>
              </div>
              <button onClick={() => setShowReabModal(false)} className="text-dark-400 hover:text-dark-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleReabastecer} className="p-6 space-y-4">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>Stock actual:</strong> {parseFloat(reabProducto.stock_actual || 0).toLocaleString()} {reabProducto.unidad_base}
                </p>
                {reabProducto.presentacion_compra && (
                  <p className="text-sm text-green-700 mt-1">
                    <strong>Presentación:</strong> {reabProducto.presentacion_compra}
                    {' '}({parseFloat(reabProducto.factor_conversion || 1).toLocaleString()} {reabProducto.unidad_base} c/u)
                  </p>
                )}
              </div>
              <div>
                <label className="label-field">
                  Cantidad de {reabProducto.presentacion_compra ? `"${reabProducto.presentacion_compra}"` : 'presentaciones'} compradas *
                </label>
                <input type="number" min="0.001" step="0.001" required
                  value={reabForm.cantidad_presentaciones}
                  onChange={e => setReabForm({ ...reabForm, cantidad_presentaciones: e.target.value })}
                  className="input-field" placeholder="Ej: 2" />
                {reabForm.cantidad_presentaciones && parseFloat(reabForm.cantidad_presentaciones) > 0 && (
                  <p className="text-xs text-green-700 mt-1 font-medium">
                    ➕ Se agregarán <strong>
                      {(parseFloat(reabForm.cantidad_presentaciones) * parseFloat(reabProducto.factor_conversion || 1)).toLocaleString()} {reabProducto.unidad_base}
                    </strong> al stock
                  </p>
                )}
              </div>
              <div>
                <label className="label-field">Notas (opcional)</label>
                <input type="text" value={reabForm.notas}
                  onChange={e => setReabForm({ ...reabForm, notas: e.target.value })}
                  className="input-field" placeholder="Ej: Compra de proveedor XYZ" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isReabasteciendo} className="btn-primary flex-1 py-2 flex items-center justify-center gap-2">
                  {isReabasteciendo ? <Loader2 className="w-5 h-5 animate-spin" /> : <><TrendingUp className="w-4 h-4" /> Confirmar Reabastecimiento</>}
                </button>
                <button type="button" onClick={() => setShowReabModal(false)} className="btn-secondary py-2">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Ajuste Manual ── */}
      {showAjusteModal && ajusteProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-dark-100">
              <div>
                <h2 className="text-xl font-bold text-dark-900">Ajuste Manual de Stock</h2>
                <p className="text-sm text-dark-500">{ajusteProducto.nombre_comercial}</p>
              </div>
              <button onClick={() => setShowAjusteModal(false)} className="text-dark-400 hover:text-dark-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAjuste} className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Stock actual:</strong> {parseFloat(ajusteProducto.stock_actual || 0).toLocaleString()} {ajusteProducto.unidad_base}
                </p>
                <p className="text-xs text-blue-600 mt-1">Usa esta opción para corregir el stock tras un inventario físico.</p>
              </div>
              <div>
                <label className="label-field">Nuevo Stock ({ajusteProducto.unidad_base}) *</label>
                <input type="number" min="0" step="0.001" required
                  value={ajusteForm.nuevo_stock}
                  onChange={e => setAjusteForm({ ...ajusteForm, nuevo_stock: e.target.value })}
                  className="input-field" />
                {ajusteForm.nuevo_stock !== '' && (
                  <p className={`text-xs mt-1 font-medium ${parseFloat(ajusteForm.nuevo_stock) >= parseFloat(ajusteProducto.stock_actual || 0) ? 'text-green-700' : 'text-red-600'}`}>
                    {parseFloat(ajusteForm.nuevo_stock) >= parseFloat(ajusteProducto.stock_actual || 0)
                      ? `➕ +${(parseFloat(ajusteForm.nuevo_stock) - parseFloat(ajusteProducto.stock_actual || 0)).toLocaleString()} ${ajusteProducto.unidad_base}`
                      : `➖ -${(parseFloat(ajusteProducto.stock_actual || 0) - parseFloat(ajusteForm.nuevo_stock)).toLocaleString()} ${ajusteProducto.unidad_base}`
                    }
                  </p>
                )}
              </div>
              <div>
                <label className="label-field">Motivo del ajuste *</label>
                <input type="text" required value={ajusteForm.notas}
                  onChange={e => setAjusteForm({ ...ajusteForm, notas: e.target.value })}
                  className="input-field" placeholder="Ej: Inventario físico mensual" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isAjustando} className="btn-primary flex-1 py-2 flex items-center justify-center gap-2">
                  {isAjustando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><BarChart2 className="w-4 h-4" /> Guardar Ajuste</>}
                </button>
                <button type="button" onClick={() => setShowAjusteModal(false)} className="btn-secondary py-2">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Asignar a Técnico ── */}
      {showAsignarModal && asignarProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-dark-100">
              <div>
                <h2 className="text-xl font-bold text-dark-900">Asignar Dotación</h2>
                <p className="text-sm text-dark-500">{asignarProducto.nombre_comercial}</p>
              </div>
              <button onClick={() => setShowAsignarModal(false)} className="text-dark-400 hover:text-dark-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAsignar} className="p-6 space-y-4">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <p className="text-sm text-indigo-800">
                  <strong>Stock disponible:</strong> {parseFloat(asignarProducto.stock_actual || 0).toLocaleString()} {asignarProducto.unidad_base}
                </p>
              </div>
              <div>
                <label className="label-field">Técnico *</label>
                <select required value={asignarForm.tecnico_id}
                  onChange={e => setAsignarForm({ ...asignarForm, tecnico_id: e.target.value })}
                  className="input-field">
                  <option value="">Seleccione un técnico...</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Cantidad ({asignarProducto.unidad_base}) *</label>
                <input type="number" min="0.001" step="0.001" required
                  value={asignarForm.cantidad}
                  onChange={e => setAsignarForm({ ...asignarForm, cantidad: e.target.value })}
                  className="input-field" placeholder="Ej: 2" />
              </div>
              <div>
                <label className="label-field">Notas (opcional)</label>
                <input type="text" value={asignarForm.notas}
                  onChange={e => setAsignarForm({ ...asignarForm, notas: e.target.value })}
                  className="input-field" placeholder="Ej: Entrega de guantes nuevos" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isAsignando} className="btn-primary flex-1 py-2 flex items-center justify-center gap-2">
                  {isAsignando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserCheck className="w-4 h-4" /> Asignar Dotación</>}
                </button>
                <button type="button" onClick={() => setShowAsignarModal(false)} className="btn-secondary py-2">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Panel: Historial de Movimientos ── */}
      {showHistorial && historialProducto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom sm:fade-in sm:zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-dark-100 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-dark-900">Historial de Movimientos</h2>
                <p className="text-sm text-dark-500">{historialProducto.nombre_comercial} · Stock: <strong>{parseFloat(historialProducto.stock_actual || 0).toLocaleString()} {historialProducto.unidad_base}</strong></p>
              </div>
              <button onClick={() => setShowHistorial(false)} className="text-dark-400 hover:text-dark-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {loadingMovimientos ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
              ) : movimientos.length === 0 ? (
                <div className="text-center py-8 text-dark-400">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Sin movimientos registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {movimientos.map(m => (
                    <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-dark-50 border border-dark-100">
                      <div className={`mt-0.5 flex-shrink-0 ${m.tipo === 'entrada' ? 'text-green-600' : m.tipo === 'salida' ? 'text-red-500' : 'text-blue-600'}`}>
                        {m.tipo === 'entrada' ? <ArrowDownCircle className="w-5 h-5" /> : m.tipo === 'salida' ? <ArrowUpCircle className="w-5 h-5" /> : <BarChart2 className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold uppercase ${m.tipo === 'entrada' ? 'text-green-700' : m.tipo === 'salida' ? 'text-red-600' : 'text-blue-700'}`}>
                            {m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'salida' ? 'Salida' : 'Ajuste'}
                          </span>
                          <span className={`text-sm font-bold ${m.tipo === 'entrada' ? 'text-green-700' : m.tipo === 'salida' ? 'text-red-600' : 'text-blue-700'}`}>
                            {m.tipo === 'entrada' ? '+' : m.tipo === 'salida' ? '-' : '±'}{parseFloat(m.cantidad).toLocaleString()} {historialProducto.unidad_base}
                          </span>
                        </div>
                        {m.referencia_tipo === 'asignacion_tecnico' && m.tecnico_asignado && (
                          <p className="text-xs text-indigo-700 mt-0.5 font-medium flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Asignado a: {m.tecnico_asignado}
                          </p>
                        )}
                        {m.notas && <p className="text-xs text-dark-500 mt-0.5 truncate">{m.notas}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {m.usuario_nombre && <span className="text-xs text-dark-400">{m.usuario_nombre}</span>}
                          <span className="text-xs text-dark-300">
                            {new Date(m.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Gestión de Activos Fijos (Seriales) ── */}
      {showActivosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-dark-100">
              <div>
                <h2 className="text-xl font-bold text-dark-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-orange-600" />
                  Gestión de Activos Fijos
                </h2>
                <p className="text-sm text-dark-500 mt-1">{activosProducto?.nombre_comercial}</p>
              </div>
              <button onClick={() => setShowActivosModal(false)} className="text-dark-400 hover:text-dark-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Formulario Agregar */}
              <form onSubmit={handleAddActivo} className="bg-dark-50 p-4 rounded-xl border border-dark-200">
                <h3 className="font-bold text-dark-800 mb-3 text-sm">Registrar Nuevo Activo Físico</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="label-field text-xs">Código / Activo Empresa *</label>
                    <input type="text" required value={nuevoActivo.codigo_activo} onChange={e => setNuevoActivo({...nuevoActivo, codigo_activo: e.target.value})} className="input-field" placeholder="Ej: FUMI-01" />
                  </div>
                  <div>
                    <label className="label-field text-xs">Nombre Específico</label>
                    <input type="text" value={nuevoActivo.nombre} onChange={e => setNuevoActivo({...nuevoActivo, nombre: e.target.value})} className="input-field" placeholder="Ej: Fumigadora Manual 20L" />
                  </div>
                  <div>
                    <label className="label-field text-xs">Estado Físico</label>
                    <select value={nuevoActivo.estado} onChange={e => setNuevoActivo({...nuevoActivo, estado: e.target.value})} className="input-field">
                      <option value="disponible">Activo / Disponible</option>
                      <option value="reparacion">En Reparación</option>
                      <option value="baja">Dado de Baja</option>
                      <option value="perdido">Perdido</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field text-xs">Marca</label>
                    <input type="text" value={nuevoActivo.marca} onChange={e => setNuevoActivo({...nuevoActivo, marca: e.target.value})} className="input-field" placeholder="Ej: Stihl" />
                  </div>
                  <div>
                    <label className="label-field text-xs">Modelo</label>
                    <input type="text" value={nuevoActivo.modelo} onChange={e => setNuevoActivo({...nuevoActivo, modelo: e.target.value})} className="input-field" placeholder="Ej: SR 450" />
                  </div>
                  <div>
                    <label className="label-field text-xs">Número de Serie</label>
                    <input type="text" value={nuevoActivo.numero_serie} onChange={e => setNuevoActivo({...nuevoActivo, numero_serie: e.target.value})} className="input-field" placeholder="Serie del fabricante" />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
                    <div className="flex-1">
                      <label className="label-field text-xs">Notas (Opcional)</label>
                      <input type="text" value={nuevoActivo.notas} onChange={e => setNuevoActivo({...nuevoActivo, notas: e.target.value})} className="input-field" placeholder="Observaciones adicionales" />
                    </div>
                    <div className="flex items-end">
                      <button type="submit" disabled={isAgregandoActivo} className="btn-primary whitespace-nowrap h-[42px] px-6">
                        {isAgregandoActivo ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Registrar</>}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Lista */}
              <div>
                <h3 className="font-bold text-dark-800 mb-3 text-sm">Activos Registrados ({activosList.length})</h3>
                {loadingActivos ? (
                  <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-600" /></div>
                ) : activosList.length === 0 ? (
                  <div className="text-center py-8 bg-white border border-dashed border-dark-200 rounded-xl">
                    <Tag className="w-8 h-8 text-dark-300 mx-auto mb-2" />
                    <p className="text-dark-500 font-medium">No hay activos registrados</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {activosList.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-white border border-dark-100 rounded-xl shadow-sm">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-dark-900">{a.codigo_activo}</span>
                            {a.nombre && <span className="text-sm text-dark-700">· {a.nombre}</span>}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              a.estado === 'disponible' ? 'bg-green-100 text-green-700' :
                              a.estado === 'prestado' ? 'bg-blue-100 text-blue-700' :
                              a.estado === 'reparacion' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {a.estado === 'disponible' ? 'Activo' : a.estado}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-dark-500">
                            {a.marca && <span><span className="font-medium text-dark-400">Marca:</span> {a.marca}</span>}
                            {a.modelo && <span><span className="font-medium text-dark-400">Mod:</span> {a.modelo}</span>}
                            {a.numero_serie && <span><span className="font-medium text-dark-400">S/N:</span> {a.numero_serie}</span>}
                          </div>

                          {a.tecnico_actual_nombre && (
                            <p className="text-xs text-blue-600 mt-1.5 font-semibold bg-blue-50 px-2 py-1 rounded inline-block">
                              En poder de: {a.tecnico_actual_nombre}
                            </p>
                          )}
                          {a.notas && <p className="text-xs text-dark-400 mt-1 italic">"{a.notas}"</p>}
                        </div>
                        {a.estado !== 'prestado' && (
                          <button 
                            onClick={() => handleDeleteActivo(a.id)}
                            className="p-1.5 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar activo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
