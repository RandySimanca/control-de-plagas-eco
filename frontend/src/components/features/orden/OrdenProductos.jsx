import { useState, useEffect } from 'react'
import { Package, Loader2, Save, Trash2, Edit, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateUUID } from '../../../utils/uuid'
import { confirmDelete } from '../../../lib/alerts'
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
  ordenTecnicoId
}) {
  const [catalogo, setCatalogo] = useState([])
  const [loadingCatalogo, setLoadingCatalogo] = useState(true)
  const [cantidades, setCantidades] = useState({}) // { tecnico_inventario_id: string }
  const [isSaving, setIsSaving] = useState(false)

  // Cargar inventario del técnico
  useEffect(() => {
    async function loadCatalogo() {
      if (!ordenTecnicoId) { setLoadingCatalogo(false); return }
      setLoadingCatalogo(true)
      try {
        if (isOnline) {
          const token = localStorage.getItem('token')
          const { data } = await api.get(`/productos-tecnicos/${ordenTecnicoId}`, { token })
          setCatalogo(data || [])
        } else {
          const cached = await db.cache_listas.get('productos_catalogo')
          if (cached?.data) setCatalogo(cached.data.filter(p => p.estado === 'activo'))
        }
      } catch (err) {
        console.error('Error cargando catálogo', err)
      } finally {
        setLoadingCatalogo(false)
      }
    }
    loadCatalogo()
  }, [isOnline, ordenTecnicoId])

  // Pre-llenar cantidades desde productos ya guardados en la orden
  useEffect(() => {
    const initial = {}
    productos.forEach(p => {
      if (p.tecnico_inventario_id && p.cantidad_numerica != null) {
        initial[p.tecnico_inventario_id] = String(p.cantidad_numerica)
      }
    })
    setCantidades(initial)
  }, [productos])

  const tiposControl = parseTipoPlaga(ordenTipoPlaga)
  const canEdit = isAssignedTecnico && ordenEstado === 'en_progreso'

  // Productos visibles según el servicio activo (para la vista de solo lectura)
  const productosMostrar = servicioFiltro
    ? productos.filter(p => p.tipo_producto?.toLowerCase() === servicioFiltro?.toLowerCase())
    : productos

  // Catálogo filtrado: solo items con stock disponible
  const catalogoDisponible = catalogo.filter(c => {
    const stockDisp = Math.max(0, parseFloat(c.cantidad_sacada || 0) - parseFloat(c.cantidad_usada || 0))
    return stockDisp > 0
  })

  async function handleSave() {
    setIsSaving(true)
    try {
      const updatedProductos = [...productos]

      for (const item of catalogoDisponible) {
        const cantidadStr = cantidades[item.id]
        const cantidad = parseFloat(cantidadStr || 0)
        const existing = updatedProductos.find(p => p.tecnico_inventario_id === item.id)

        if (cantidad > 0) {
          const cantidadTexto = `${cantidad} ${item.unidad_base || ''}`.trim()
          if (existing) {
            const payload = {
              ...existing,
              cantidad: cantidadTexto,
              cantidad_numerica: cantidad,
              tipo_producto: servicioFiltro || existing.tipo_producto || '',
            }
            await queueOrExecute('productos_usados', 'update', payload, ordenId)
            const idx = updatedProductos.findIndex(p => p.id === existing.id)
            if (idx >= 0) updatedProductos[idx] = { ...updatedProductos[idx], ...payload }
          } else {
            const payload = {
              id: generateUUID(),
              orden_id: ordenId,
              created_at: new Date().toISOString(),
              nombre_producto: item.nombre_comercial,
              nombre_comercial: item.nombre_comercial,
              ingrediente_activo: item.ingrediente_activo || '',
              dosis: item.dosis_recomendada || '',
              cantidad: cantidadTexto,
              cantidad_numerica: cantidad,
              unidad: item.unidad_base || null,
              catalogo_id: item.catalogo_id,
              tecnico_inventario_id: item.id,
              lote: item.lote || null,
              tipo_producto: servicioFiltro || tiposControl[0] || '',
            }
            const { data } = await queueOrExecute('productos_usados', 'insert', payload, ordenId)
            updatedProductos.unshift(data?.[0] || payload)
          }
        } else if (cantidad === 0 && existing) {
          // Si el técnico pone 0 y ya existía, se elimina el registro
          await queueOrExecute('productos_usados', 'delete', { id: existing.id }, ordenId)
          const idx = updatedProductos.findIndex(p => p.id === existing.id)
          if (idx >= 0) updatedProductos.splice(idx, 1)
        }
      }

      setProductos(updatedProductos)
      toast.success('Registro de uso guardado correctamente')
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteManual(id) {
    const confirmed = await confirmDelete('¿Eliminar producto?', 'Se borrará este registro de uso.')
    if (!confirmed) return
    try {
      await queueOrExecute('productos_usados', 'delete', { id }, ordenId)
      setProductos(productos.filter(p => p.id !== id))
      toast.success('Eliminado')
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message)
    }
  }

  // ── Vista de solo lectura (admin o estado no editable) ──────────────────────
  if (!canEdit) {
    return (
      <div className="card">
        <div className="flex items-center mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            Productos Utilizados {servicioFiltro ? `(${servicioFiltro})` : ''}
          </h2>
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
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-primary-600 uppercase tracking-wider block mb-0.5">
                      {p.tipo_producto || 'Producto'}
                    </span>
                    <span className="text-sm font-bold text-dark-900 block">
                      {p.nombre_comercial || p.nombre_producto}
                    </span>
                    {p.lote && <span className="text-xs text-dark-500">Lote: {p.lote}</span>}
                  </div>
                  <span className="text-sm font-medium text-dark-800 bg-white px-2 py-1 rounded-lg border border-dark-200">
                    {p.cantidad || 'N/A'}
                  </span>
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
    )
  }

  // ── Vista editable del técnico (inline) ──────────────────────────────────────
  return (
    <div className="card">
      <div className="flex items-center mb-1">
        <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-600" />
          Productos & Dosis {servicioFiltro ? `(${servicioFiltro})` : ''}
        </h2>
      </div>
      <p className="text-xs text-dark-400 mb-4">
        Ingresa cuánto usaste de cada insumo. Lo que no uses se registrará como devolución.
      </p>

      {loadingCatalogo ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : catalogoDisponible.length === 0 ? (
        <div className="text-center py-8 bg-dark-50 rounded-xl border border-dashed border-dark-200">
          <Package className="w-8 h-8 text-dark-200 mx-auto mb-2" />
          <p className="text-sm font-medium text-dark-500">No hay insumos en tu vehículo</p>
          <p className="text-xs text-dark-400 mt-1">Registra salida de bodega desde el panel principal</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {catalogoDisponible.map(item => {
              const stockDisp = Math.max(0, parseFloat(item.cantidad_sacada || 0) - parseFloat(item.cantidad_usada || 0))
              const cantidadUsada = parseFloat(cantidades[item.id] || 0)
              const devolucion = Math.max(0, stockDisp - cantidadUsada)
              const yaRegistrado = productos.some(p => p.tecnico_inventario_id === item.id)
              const excede = cantidadUsada > stockDisp

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition-all ${
                    excede
                      ? 'bg-red-50 border-red-300'
                      : yaRegistrado && cantidadUsada > 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-dark-200'
                  }`}
                >
                  {/* Encabezado del producto */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-bold text-dark-900 text-sm truncate">{item.nombre_comercial}</p>
                      <div className="flex gap-3 text-xs text-dark-500 mt-0.5 flex-wrap">
                        {item.lote && <span>Lote: <span className="font-medium text-dark-700">{item.lote}</span></span>}
                        {item.ingrediente_activo && <span>{item.ingrediente_activo}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-dark-400 uppercase tracking-wider">Disponible</p>
                      <p className="text-sm font-black text-dark-800">
                        {stockDisp.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                        <span className="text-xs font-normal text-dark-500 ml-1">{item.unidad_base}</span>
                      </p>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="flex items-end gap-3">
                    {/* Cantidad usada */}
                    <div className="flex-1">
                      <label className="text-xs font-medium text-dark-600 mb-1 block">¿Cuánto usaste?</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          className={`input-field flex-1 text-center font-bold text-base ${excede ? 'border-red-400 bg-red-50' : ''}`}
                          value={cantidades[item.id] ?? ''}
                          onChange={e => setCantidades(prev => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="0"
                        />
                        <span className="text-xs text-dark-500 w-10 text-center shrink-0">{item.unidad_base}</span>
                      </div>
                      {excede && (
                        <p className="text-[10px] text-red-600 mt-1">⚠️ Supera el disponible. Se guardará igual.</p>
                      )}
                    </div>

                    {/* Se devolverán */}
                    {cantidadUsada > 0 && !excede && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-right shrink-0 min-w-[90px]">
                        <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wider">Se devuelven</p>
                        <p className="text-sm font-black text-blue-700">
                          {devolucion.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                          <span className="text-[10px] font-normal ml-1">{item.unidad_base}</span>
                        </p>
                      </div>
                    )}
                    {cantidadUsada > 0 && excede && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-right shrink-0 min-w-[90px]">
                        <p className="text-[10px] text-orange-500 font-medium uppercase tracking-wider">Se devuelven</p>
                        <p className="text-sm font-black text-orange-700">0
                          <span className="text-[10px] font-normal ml-1">{item.unidad_base}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Productos manuales (ingresados sin inventario del técnico) */}
          {productosMostrar.filter(p => !p.tecnico_inventario_id).length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-dark-500 uppercase tracking-wider mb-2">Registros manuales</p>
              <div className="space-y-2">
                {productosMostrar.filter(p => !p.tecnico_inventario_id).map((p, i) => (
                  <div key={p.id || i} className="bg-dark-50 p-3 rounded-xl border border-dark-100 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-dark-900">{p.nombre_comercial || p.nombre_producto}</p>
                      {p.lote && <p className="text-xs text-dark-500">Lote: {p.lote}</p>}
                      <p className="text-xs text-dark-600 mt-0.5">Cant: {p.cantidad}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteManual(p.id)}
                      className="p-1.5 text-dark-400 hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isSaving
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><Save className="w-4 h-4" /> Guardar Registro de Uso</>
            }
          </button>
        </>
      )}
    </div>
  )
}
