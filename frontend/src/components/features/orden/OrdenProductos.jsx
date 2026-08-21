import { useState, useEffect } from 'react'
import { Package, Plus, Trash2, Edit, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateUUID } from '../../../utils/uuid'
import { confirmDelete, successAlert } from '../../../lib/alerts'
import { parseTipoPlaga } from '../../../utils/tipoPlaga'
import db from '../../../lib/db'
import api from '../../../lib/api'

export default function OrdenProductos({
  ordenId,
  productos,
  setProductos,
  isAssignedTecnico,
  ordenEstado,
  queueOrExecute,
  ordenTipoPlaga,
  servicioFiltro,
  isOnline,
  ordenTecnicoId // ID del técnico asignado a la orden
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [catalogo, setCatalogo] = useState([]) // Ahora representará el inventario del técnico

  const [formData, setFormData] = useState({
    nombre_comercial: '',
    ingrediente_activo: '',
    dosis: '',
    cantidad: '',
    cantidad_numerica: '',
    unidad: '',
    tipo_producto: servicioFiltro || '',
    es_manual: false,
    catalogo_id: null,
    tecnico_inventario_id: null, // Nuevo campo
    lote: '',
    _stock_disponible: null,
    _unidad_base: ''
  })

  useEffect(() => {
    async function loadCatalogo() {
      if (!ordenTecnicoId) return // Si no hay técnico asignado, no podemos cargar inventario
      try {
        if (isOnline) {
          const token = localStorage.getItem('token')
          const { data } = await api.get(`/productos-tecnicos/${ordenTecnicoId}`, { token })
          setCatalogo(data?.data || [])
        } else {
          // Fallback offline (se podría guardar el inventario del técnico en IndexedDB si quisiéramos offline total para esto)
          const cached = await db.cache_listas.get('productos_catalogo')
          if (cached && cached.data) {
            setCatalogo(cached.data.filter(p => p.estado === 'activo'))
          }
        }
      } catch (err) {
        console.error('Error cargando catálogo', err)
      }
    }
    loadCatalogo()
  }, [isOnline, ordenTecnicoId])

  const tiposControl = parseTipoPlaga(ordenTipoPlaga);

  const canEdit = isAssignedTecnico && ordenEstado === 'en_progreso'

  function resetForm() {
    setFormData({
      nombre_comercial: '',
      ingrediente_activo: '',
      dosis: '',
      cantidad: '',
      cantidad_numerica: '',
      unidad: '',
      tipo_producto: servicioFiltro || (tiposControl.length === 1 ? tiposControl[0] : ''),
      es_manual: false,
      catalogo_id: null,
      tecnico_inventario_id: null,
      lote: '',
      _stock_disponible: null,
      _unidad_base: ''
    })
    setEditingId(null)
  }

  function handleProductSelect(e) {
    const val = e.target.value
    if (val === 'manual') {
      setFormData({
        ...formData,
        nombre_comercial: '', ingrediente_activo: '', dosis: '',
        es_manual: true, catalogo_id: null, tecnico_inventario_id: null, lote: '', _stock_disponible: null, _unidad_base: '',
        cantidad_numerica: '', unidad: ''
      })
    } else {
      const prod = catalogo.find(p => p.id === val)
      if (prod) {
        setFormData({
          ...formData,
          nombre_comercial: prod.nombre_comercial,
          ingrediente_activo: prod.ingrediente_activo || '',
          dosis: prod.dosis_recomendada || '',
          es_manual: false,
          tipo_producto: formData.tipo_producto || prod.tipo_producto || '',
          catalogo_id: prod.catalogo_id,
          tecnico_inventario_id: prod.id, // The ID from tecnicos_inventario
          lote: prod.lote || '',
          unidad: prod.unidad_base || 'unidad',
          _stock_disponible: Math.max(0, parseFloat(prod.cantidad_sacada) - parseFloat(prod.cantidad_usada)),
          _unidad_base: prod.unidad_base || 'unidad'
        })
      }
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!formData.nombre_comercial.trim()) return

    const tipoFinal = servicioFiltro || formData.tipo_producto
    // Construir cantidad en texto para retrocompatibilidad
    const cantidadTexto = formData.cantidad_numerica
      ? `${formData.cantidad_numerica} ${formData.unidad || ''}`.trim()
      : formData.cantidad || 'N/A'

    setIsSaving(true)
    try {
      if (editingId) {
        const payload = {
          ...formData, tipo_producto: tipoFinal, id: editingId,
          nombre_producto: formData.nombre_comercial,
          cantidad: cantidadTexto,
          cantidad_numerica: formData.cantidad_numerica ? parseFloat(formData.cantidad_numerica) : null,
          unidad: formData.unidad || null,
          catalogo_id: formData.catalogo_id || null,
          tecnico_inventario_id: formData.tecnico_inventario_id || null,
          lote: formData.lote || null
        }
        delete payload.es_manual; delete payload._stock_disponible; delete payload._unidad_base
        const { queued } = await queueOrExecute('productos_usados', 'update', payload, ordenId)
        setProductos(productos.map(p => p.id === editingId ? { ...p, ...payload } : p))
        toast.success(queued ? 'Actualizado offline ⚡' : 'Producto actualizado')
        setShowEditModal(false)
      } else {
        const payload = {
          ...formData, tipo_producto: tipoFinal,
          id: generateUUID(), orden_id: ordenId, created_at: new Date().toISOString(),
          nombre_producto: formData.nombre_comercial,
          cantidad: cantidadTexto,
          cantidad_numerica: formData.cantidad_numerica ? parseFloat(formData.cantidad_numerica) : null,
          unidad: formData.unidad || null,
          catalogo_id: formData.catalogo_id || null,
          tecnico_inventario_id: formData.tecnico_inventario_id || null,
          lote: formData.lote || null
        }
        delete payload.es_manual; delete payload._stock_disponible; delete payload._unidad_base
        const { data, queued } = await queueOrExecute('productos_usados', 'insert', payload, ordenId)
        const savedData = data?.[0] || payload
        setProductos([savedData, ...productos])
        toast.success(queued ? 'Guardado offline ⚡' : 'Producto registrado')
        setShowAddModal(false)
      }
      resetForm()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    const isConfirmed = await confirmDelete('¿Estás seguro?', 'Se borrará este producto de la lista.')
    if (!isConfirmed) return
    try {
      const { queued } = await queueOrExecute('productos_usados', 'delete', { id }, ordenId)
      setProductos(productos.filter(p => p.id !== id))
      if (!queued) await successAlert('¡Eliminado!', 'Producto eliminado')
      else toast.success('Eliminación guardada offline ⚡')
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message)
    }
  }

  function openEdit(prod) {
    const match = prod.tecnico_inventario_id
      ? catalogo.find(c => c.id === prod.tecnico_inventario_id)
      : (prod.catalogo_id 
          ? catalogo.find(c => c.catalogo_id === prod.catalogo_id) 
          : catalogo.find(c => c.nombre_comercial === (prod.nombre_comercial || prod.nombre_producto)))

    setFormData({
      nombre_comercial: prod.nombre_comercial || prod.nombre_producto || '',
      ingrediente_activo: prod.ingrediente_activo || '',
      dosis: prod.dosis || '',
      cantidad: prod.cantidad || '',
      cantidad_numerica: prod.cantidad_numerica ?? '',
      unidad: prod.unidad || match?.unidad_base || '',
      tipo_producto: prod.tipo_producto || '',
      es_manual: !match,
      catalogo_id: prod.catalogo_id || match?.catalogo_id || null,
      tecnico_inventario_id: prod.tecnico_inventario_id || match?.id || null,
      lote: prod.lote || match?.lote || '',
      _stock_disponible: match ? Math.max(0, parseFloat(match.cantidad_sacada) - parseFloat(match.cantidad_usada)) : null,
      _unidad_base: match?.unidad_base || ''
    })
    setEditingId(prod.id)
    setShowEditModal(true)
  }

  const productosMostrar = servicioFiltro
    ? productos.filter(p => p.tipo_producto?.toLowerCase() === servicioFiltro?.toLowerCase())
    : productos

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" /> Productos Utilizados {servicioFiltro ? `(${servicioFiltro})` : ''}
          </h2>
          {canEdit && (
            <button 
              onClick={() => { resetForm(); setShowAddModal(true) }} 
              className="btn-secondary text-sm py-1.5"
            >
              <Plus className="w-4 h-4" /> Agregar Producto
            </button>
          )}
        </div>

        {productosMostrar.length === 0 ? (
          <div className="text-center py-6 bg-dark-50 rounded-xl border border-dashed border-dark-200">
            <Package className="w-6 h-6 text-dark-300 mx-auto mb-2" />
            <p className="text-sm text-dark-400">Sin productos registrados {servicioFiltro ? `para ${servicioFiltro}` : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {productosMostrar.map((p, i) => (
              <div key={p.id || i} className="bg-dark-50 p-3 rounded-xl border border-dark-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-0.5">
                      {p.tipo_producto || 'Producto Utilizado'}
                    </span>
                    <span className="text-sm font-bold text-dark-900 block">
                      {p.nombre_comercial || p.nombre_producto || 'Sin nombre'}
                    </span>
                    {p.lote && (
                      <span className="text-xs text-dark-500 block mt-0.5 font-medium">Lote/Identificador: {p.lote}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-medium text-dark-800 bg-white px-2 py-1 rounded-lg border border-dark-200">
                      Cant: {p.cantidad || 'N/A'}
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1 text-dark-400 hover:text-primary-600 transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1 text-dark-400 hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {p.ingrediente_activo && (
                    <div className="text-xs text-dark-500 bg-white p-1.5 rounded border border-dark-100">
                      <span className="font-medium text-dark-600 block">Ingrediente activo:</span>
                      {p.ingrediente_activo}
                    </div>
                  )}
                  {p.dosis && (
                    <div className="text-xs text-dark-500 bg-white p-1.5 rounded border border-dark-100">
                      <span className="font-medium text-dark-600 block">Dosis:</span>
                      {p.dosis}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Add/Edit Product */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between">
              <h3 className="font-bold text-dark-900">
                {editingId ? 'Editar Producto' : 'Agregar Producto'}
              </h3>
              <button 
                onClick={() => editingId ? setShowEditModal(false) : setShowAddModal(false)} 
                className="p-2 hover:bg-dark-50 rounded-lg text-dark-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {servicioFiltro ? (
                <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-200/60 mb-2">
                  <span className="text-xs text-indigo-700 font-bold block uppercase tracking-wider">Control Específico:</span>
                  <span className="text-sm font-black text-indigo-900">{servicioFiltro}</span>
                </div>
              ) : tiposControl.length > 0 && (
                <div>
                  <label className="label-field">Tipo de Control Asociado</label>
                  <select
                    className="input-field"
                    value={formData.tipo_producto}
                    onChange={e => setFormData({ ...formData, tipo_producto: e.target.value })}
                  >
                    <option value="">Seleccione a qué control aplica...</option>
                    {tiposControl.map(tc => (
                      <option key={tc} value={tc}>{tc}</option>
                    ))}
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              )}

              <div>
                <label className="label-field">Producto del Catálogo *</label>
                <select
                  className="input-field font-semibold text-primary-700"
                  value={formData.es_manual ? 'manual' : (catalogo.find(c => c.nombre_comercial === formData.nombre_comercial)?.id || '')}
                  onChange={handleProductSelect}
                  required
                >
                  <option value="" disabled>Seleccione un producto de su inventario...</option>
                  {catalogo.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre_comercial} {c.lote ? `(Lote: ${c.lote})` : ''} - Disp: {parseFloat((Math.max(0, parseFloat(c.cantidad_sacada) - parseFloat(c.cantidad_usada))).toFixed(3))} {c.unidad_base}
                    </option>
                  ))}
                  <option value="manual">-- Otro (Ingreso Manual) --</option>
                </select>
              </div>

              {formData.es_manual && (
                <div>
                  <label className="label-field">Nombre Comercial (Manual) *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.nombre_comercial}
                    onChange={e => setFormData({ ...formData, nombre_comercial: e.target.value })}
                    placeholder="Ej: K-Othrine WG 250"
                    required={formData.es_manual}
                  />
                </div>
              )}
              
              <div>
                <label className="label-field">Ingrediente Activo</label>
                <input
                  type="text"
                  className={`input-field ${!formData.es_manual ? 'bg-dark-50/50' : ''}`}
                  value={formData.ingrediente_activo}
                  onChange={e => setFormData({ ...formData, ingrediente_activo: e.target.value })}
                  placeholder="Ej: Deltametrina"
                  readOnly={!formData.es_manual}
                />
              </div>
              <div>
                <label className="label-field">Dosis a Usar</label>
                <input
                  type="text"
                  className={`input-field ${!formData.es_manual ? 'bg-dark-50/50' : ''}`}
                  value={formData.dosis}
                  onChange={e => setFormData({ ...formData, dosis: e.target.value })}
                  placeholder="Ej: 5g / Litro"
                />
              </div>

              {/* Cantidad numérica + unidad (si proviene del catálogo) */}
              {!formData.es_manual && formData.catalogo_id ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label-field mb-0">Cantidad Usada *</label>
                    {formData._stock_disponible !== null && (
                      <span className={`text-xs font-bold ${
                        formData._stock_disponible === 0 ? 'text-red-600'
                        : parseFloat(formData.cantidad_numerica || 0) > formData._stock_disponible ? 'text-amber-600'
                        : 'text-green-700'
                      }`}>
                        Disponible: {formData._stock_disponible.toLocaleString()} {formData._unidad_base}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number" min="0.001" step="0.001" required
                      className="input-field flex-1"
                      value={formData.cantidad_numerica}
                      onChange={e => setFormData({ ...formData, cantidad_numerica: e.target.value })}
                      placeholder="Ej: 250"
                    />
                    <span className="input-field w-20 bg-dark-50 text-center font-bold text-dark-700 cursor-default">
                      {formData._unidad_base || formData.unidad || '—'}
                    </span>
                  </div>
                  {/* Advertencia de stock insuficiente */}
                  {formData._stock_disponible !== null &&
                   parseFloat(formData.cantidad_numerica || 0) > formData._stock_disponible &&
                   formData._stock_disponible >= 0 && (
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                      <span>⚠️</span>
                      <span>
                        La cantidad ingresada supera el stock disponible.
                        Se registrará de todas formas, pero el inventario quedará en cero.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="label-field">Cantidad Usada</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.cantidad}
                    onChange={e => setFormData({ ...formData, cantidad: e.target.value })}
                    placeholder="Ej: 2 Litros"
                  />
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isSaving} className="btn-primary flex-1">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar Producto'}
                </button>
                <button 
                  type="button" 
                  onClick={() => editingId ? setShowEditModal(false) : setShowAddModal(false)} 
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
