import { useState } from 'react'
import { Package, Plus, Trash2, Edit, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateUUID } from '../../../utils/uuid'
import { confirmDelete, successAlert } from '../../../lib/alerts'
import { parseTipoPlaga } from '../../../utils/tipoPlaga'

export default function OrdenProductos({
  ordenId,
  productos,
  setProductos,
  isAssignedTecnico,
  ordenEstado,
  queueOrExecute,
  ordenTipoPlaga
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [formData, setFormData] = useState({
    nombre_comercial: '',
    ingrediente_activo: '',
    dosis: '',
    cantidad: '',
    tipo_producto: ''
  })

  const tiposControl = parseTipoPlaga(ordenTipoPlaga);

  const canEdit = isAssignedTecnico && ordenEstado === 'en_progreso'

  function resetForm() {
    setFormData({
      nombre_comercial: '',
      ingrediente_activo: '',
      dosis: '',
      cantidad: '',
      tipo_producto: tiposControl.length === 1 ? tiposControl[0] : ''
    })
    setEditingId(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!formData.nombre_comercial.trim()) return

    setIsSaving(true)
    try {
      if (editingId) {
        // Edit
        const payload = { ...formData, id: editingId, nombre_producto: formData.nombre_comercial, cantidad: formData.cantidad || 'N/A' }
        const { queued } = await queueOrExecute('productos_usados', 'update', payload, ordenId)
        setProductos(productos.map(p => p.id === editingId ? { ...p, ...payload } : p))
        toast.success(queued ? 'Actualizado offline ⚡' : 'Producto actualizado')
        setShowEditModal(false)
      } else {
        // Create
        const payload = { ...formData, id: generateUUID(), orden_id: ordenId, created_at: new Date().toISOString(), nombre_producto: formData.nombre_comercial, cantidad: formData.cantidad || 'N/A' }
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
    setFormData({
      nombre_comercial: prod.nombre_comercial || prod.nombre_producto || '',
      ingrediente_activo: prod.ingrediente_activo || '',
      dosis: prod.dosis || '',
      cantidad: prod.cantidad || '',
      tipo_producto: prod.tipo_producto || ''
    })
    setEditingId(prod.id)
    setShowEditModal(true)
  }

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" /> Productos Utilizados
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

        {productos.length === 0 ? (
          <div className="text-center py-6 bg-dark-50 rounded-xl border border-dashed border-dark-200">
            <Package className="w-6 h-6 text-dark-300 mx-auto mb-2" />
            <p className="text-sm text-dark-400">Sin productos registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {productos.map((p, i) => (
              <div key={p.id || i} className="bg-dark-50 p-3 rounded-xl border border-dark-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-0.5">
                      {p.tipo_producto || 'Producto Utilizado'}
                    </span>
                    <span className="text-sm font-bold text-dark-900 block">
                      {p.nombre_comercial || p.nombre_producto || 'Sin nombre'}
                    </span>
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
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {tiposControl.length > 0 && (
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
                <label className="label-field">Nombre Comercial *</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.nombre_comercial}
                  onChange={e => setFormData({ ...formData, nombre_comercial: e.target.value })}
                  placeholder="Ej: K-Othrine WG 250"
                  required
                />
              </div>
              <div>
                <label className="label-field">Ingrediente Activo</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.ingrediente_activo}
                  onChange={e => setFormData({ ...formData, ingrediente_activo: e.target.value })}
                  placeholder="Ej: Deltametrina"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Dosis a Usar</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.dosis}
                    onChange={e => setFormData({ ...formData, dosis: e.target.value })}
                    placeholder="Ej: 5g / Litro"
                  />
                </div>
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
              </div>
              
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
