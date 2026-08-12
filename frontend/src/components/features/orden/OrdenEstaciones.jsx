import { useState, useEffect, useCallback } from 'react'
import { Package, Camera, X, Loader2, Plus, CheckCircle2, Circle, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAuthImageUrl } from '../../../utils/imageUtils'
import { generateUUID } from '../../../utils/uuid'
import db from '../../../lib/db'
import api from '../../../lib/api'

const DEFAULT_TYPES = ['Cebadero', 'Impacto', 'Jaula atrapavivos']

export default function OrdenEstaciones({ ordenId, clienteId, estaciones, setEstaciones, isAssignedTecnico, ordenEstado, isOnline, queueOrExecute, queuePhoto }) {
  const [maestras, setMaestras] = useState([])
  const [loadingMaestras, setLoadingMaestras] = useState(true)

  // Estado de qué estación está expandida para editar
  const [expandedId, setExpandedId] = useState(null)
  // Estado de edición por estación: { [maestraId]: { observaciones, es_nueva_instalacion, fotos, saving } }
  const [editStates, setEditStates] = useState({})

  // Formulario nueva estación
  const [showNueva, setShowNueva] = useState(false)
  const [nuevaEstacion, setNuevaEstacion] = useState({ tipo: 'Cebadero', numero: '', ubicacion: '' })
  const [savingNueva, setSavingNueva] = useState(false)

  const reloadEstaciones = useCallback(async () => {
    if (!isOnline) return
    const token = localStorage.getItem('token')
    try {
      const res = await api.get('/estaciones-usadas', { params: { orden_id: ordenId }, token })
      setEstaciones(res.data || [])
    } catch (err) {
      console.error('Error recargando estaciones', err)
    }
  }, [isOnline, ordenId, setEstaciones])

  useEffect(() => {
    async function loadMaestras() {
      try {
        if (isOnline) {
          const token = localStorage.getItem('token')
          const { data } = await api.get(`/clientes/${clienteId}/estaciones`, { token })
          setMaestras(data || [])
        } else {
          const snapshot = await db.ordenes.get(ordenId)
          if (snapshot?.estaciones_maestras) {
            setMaestras(snapshot.estaciones_maestras)
          }
        }
      } catch (err) {
        console.error('Error cargando estaciones maestras', err)
      } finally {
        setLoadingMaestras(false)
      }
    }
    if (clienteId) loadMaestras()
  }, [clienteId, isOnline, ordenId])

  // Inicializar estado de edición cuando cambian maestras o estaciones
  useEffect(() => {
    const states = {}
    maestras.forEach(m => {
      const existing = estaciones.find(e => e.estacion_id === m.id)
      states[m.id] = {
        observaciones: existing?.observaciones || '',
        es_nueva_instalacion: existing?.es_nueva_instalacion || false,
        fotos: existing?.fotos || [],
        id_usada: existing?.id || generateUUID(),
        is_existing: !!existing,
        saving: false
      }
    })
    setEditStates(states)
  }, [maestras, estaciones])

  function toggleExpand(mId) {
    setExpandedId(prev => prev === mId ? null : mId)
  }

  async function handleSaveEstacion(mId) {
    const token = localStorage.getItem('token')
    const edit = editStates[mId]
    const maestra = maestras.find(m => m.id === mId)
    if (!edit || !maestra) return

    setEditStates(prev => ({ ...prev, [mId]: { ...prev[mId], saving: true } }))

    try {
      const dbPayload = {
        id: edit.id_usada,
        orden_id: ordenId,
        estacion_id: mId,
        tipo_estacion: maestra.tipo,
        observaciones: edit.observaciones,
        es_nueva_instalacion: edit.es_nueva_instalacion
      }

      if (edit.is_existing) {
        await queueOrExecute('estaciones_usadas', 'update', {
          id: edit.id_usada,
          observaciones: edit.observaciones,
          es_nueva_instalacion: edit.es_nueva_instalacion
        }, ordenId)
      } else {
        await queueOrExecute('estaciones_usadas', 'insert', dbPayload, ordenId)
        // Marcar actividad en bitácora
        await queueOrExecute('actividades_servicio', 'insert', {
          id: generateUUID(),
          orden_id: ordenId,
          descripcion: `Monitoreo registrado: Estación #${maestra.numero} (${maestra.tipo}).`,
          created_at: new Date().toISOString()
        }, ordenId)
      }

      // Subir fotos nuevas
      const newFotos = edit.fotos.filter(f => !f.id || f.id.startsWith('temp_'))
      if (isOnline) {
        for (const foto of newFotos) {
          await api.post('/fotos-estaciones', {
            estacion_usada_id: edit.id_usada,
            url: foto.url,
            storage_path: foto.storage_path,
            descripcion: foto.descripcion || ''
          }, { token })
        }
      } else {
        const pendingAll = await db.fotos_pendientes.toArray()
        for (const foto of newFotos) {
          const match = pendingAll.find(p => p.path === foto.storage_path)
          if (match) {
            await db.fotos_pendientes.update(match.id, {
              dbTable: 'fotos_estaciones',
              dbPayload: {
                id: generateUUID(),
                estacion_usada_id: edit.id_usada,
                storage_path: foto.storage_path,
                descripcion: foto.descripcion || ''
              }
            })
          }
        }
      }

      // Recargar lista completa de estaciones para reflejar cambios en tiempo real
      await reloadEstaciones()

      setExpandedId(null)
      toast.success(`Estación #${maestra.numero} guardada`)
    } catch (err) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setEditStates(prev => ({ ...prev, [mId]: { ...prev[mId], saving: false } }))
    }
  }

  async function handleAddFoto(mId, file) {
    if (!file) return
    const maestra = maestras.find(m => m.id === mId)
    const path = `estaciones/orden_${ordenId}_${maestra.numero}_${Date.now()}.jpg`
    try {
      const { publicUrl, error } = await queuePhoto('fotos-servicio', path, file, file.type || 'image/jpeg')
      if (error) throw error
      const newFoto = { id: 'temp_' + generateUUID(), url: publicUrl, storage_path: path, descripcion: '' }
      setEditStates(prev => ({
        ...prev,
        [mId]: { ...prev[mId], fotos: [...prev[mId].fotos, newFoto] }
      }))
      toast.success('Foto agregada')
    } catch (err) {
      toast.error('Error con foto: ' + err.message)
    }
  }

  async function handleDeleteFoto(mId, foto) {
    const token = localStorage.getItem('token')
    try {
      if (foto.id && !foto.id.startsWith('temp_') && isOnline) {
        await api.delete(`/fotos-estaciones/${foto.id}`, { token })
      }
      setEditStates(prev => ({
        ...prev,
        [mId]: { ...prev[mId], fotos: prev[mId].fotos.filter(f => f.id !== foto.id) }
      }))
    } catch (err) {
      toast.error('Error al eliminar foto')
    }
  }

  async function handleAddMaestra(e) {
    e.preventDefault()
    if (!nuevaEstacion.numero) return toast.error('El número es obligatorio')
    setSavingNueva(true)
    const mId = generateUUID()
    try {
      await queueOrExecute('estaciones', 'insert', {
        id: mId,
        cliente_id: clienteId,
        numero: nuevaEstacion.numero,
        tipo: nuevaEstacion.tipo,
        ubicacion: nuevaEstacion.ubicacion
      }, ordenId)
      const token = localStorage.getItem('token')
      const { data } = await api.get(`/clientes/${clienteId}/estaciones`, { token })
      setMaestras(data || [])
      setShowNueva(false)
      setNuevaEstacion({ tipo: 'Cebadero', numero: '', ubicacion: '' })
      // Auto-expandir la nueva estación para que el técnico la registre
      setExpandedId(mId)
      toast.success('Estación creada. Completa el monitoreo y guarda.')
    } catch (err) {
      toast.error('Error al crear estación')
    } finally {
      setSavingNueva(false)
    }
  }

  const canEdit = isAssignedTecnico && ordenEstado === 'en_progreso'

  if (loadingMaestras) return (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" />
      <p className="text-xs text-dark-400 mt-2">Cargando estaciones…</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-dark-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-600" /> Trazabilidad de Estaciones
        </h2>
        <span className="text-xs text-dark-400 bg-dark-50 px-2 py-1 rounded-full">
          {estaciones.length}/{maestras.length} monitoreadas
        </span>
      </div>

      {maestras.length === 0 && (
        <div className="text-center py-8 bg-dark-50 rounded-xl border border-dashed border-dark-200">
          <AlertCircle className="w-8 h-8 text-dark-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-dark-500">Sin estaciones registradas</p>
          <p className="text-xs text-dark-400 mt-1">Agrega la primera estación para este cliente.</p>
        </div>
      )}

      {/* Lista de estaciones agrupada por tipo */}
      {DEFAULT_TYPES.map(tipo => {
        const typeMaestras = maestras.filter(m => m.tipo === tipo)
        if (typeMaestras.length === 0) return null

        return (
          <div key={tipo}>
            <h3 className="text-xs font-bold text-dark-500 uppercase tracking-wider mb-2 px-1">{tipo}s</h3>
            <div className="space-y-2">
              {typeMaestras.map(m => {
                const registered = estaciones.find(e => e.estacion_id === m.id)
                const edit = editStates[m.id]
                const isExpanded = expandedId === m.id

                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      registered
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-dark-100 bg-white'
                    }`}
                  >
                    {/* Cabecera de la estación */}
                    <div
                      className="flex items-center justify-between px-3 py-2.5 cursor-pointer"
                      onClick={() => canEdit && toggleExpand(m.id)}
                    >
                      <div className="flex items-center gap-2.5">
                        {registered
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          : <Circle className="w-4 h-4 text-dark-300 shrink-0" />
                        }
                        <div>
                          <span className="text-sm font-bold text-dark-900">#{m.numero}</span>
                          {m.ubicacion && <span className="text-xs text-dark-400 ml-2">{m.ubicacion}</span>}
                        </div>
                        {registered?.es_nueva_instalacion && (
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full uppercase">Nueva</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {registered?.observaciones && (
                          <span className="text-[10px] text-dark-400 italic hidden sm:inline truncate max-w-[120px]">
                            {registered.observaciones}
                          </span>
                        )}
                        {canEdit && (
                          isExpanded
                            ? <ChevronUp className="w-4 h-4 text-dark-400" />
                            : <ChevronDown className="w-4 h-4 text-dark-400" />
                        )}
                      </div>
                    </div>

                    {/* Fotos en modo lectura */}
                    {!isExpanded && registered?.fotos?.length > 0 && (
                      <div className="px-3 pb-2 grid grid-cols-5 gap-1">
                        {registered.fotos.map((f, i) => (
                          <img key={i} src={getAuthImageUrl(f.url)} className="aspect-square rounded object-cover border border-dark-100 w-full" alt="evidencia" />
                        ))}
                      </div>
                    )}

                    {/* Panel de edición expandible */}
                    {isExpanded && edit && (
                      <div className="px-3 pb-3 pt-1 border-t border-dark-100 space-y-3 bg-white">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={edit.es_nueva_instalacion}
                            onChange={ev => setEditStates(prev => ({ ...prev, [m.id]: { ...prev[m.id], es_nueva_instalacion: ev.target.checked } }))}
                            className="w-3.5 h-3.5 rounded border-dark-300 text-primary-600"
                          />
                          <span className="text-xs font-bold text-dark-700">Nueva Instalación</span>
                        </label>

                        <textarea
                          placeholder="Observaciones del monitoreo…"
                          value={edit.observaciones}
                          onChange={ev => setEditStates(prev => ({ ...prev, [m.id]: { ...prev[m.id], observaciones: ev.target.value } }))}
                          className="input-field text-sm bg-white w-full"
                          rows={2}
                        />

                        {/* Fotos */}
                        <div>
                          <p className="text-[10px] font-bold text-dark-400 uppercase mb-1.5">Evidencias ({edit.fotos.length})</p>
                          <div className="grid grid-cols-5 gap-1.5">
                            {edit.fotos.map((foto, fIdx) => (
                              <div key={foto.id || fIdx} className="relative aspect-square rounded border border-dark-200 bg-white overflow-hidden group">
                                <img src={getAuthImageUrl(foto.url)} className="w-full h-full object-cover" alt="Evidencia" />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFoto(m.id, foto)}
                                  className="absolute top-0 right-0 p-0.5 bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <label className="aspect-square rounded border border-dashed border-dark-300 hover:border-primary-500 flex flex-col items-center justify-center cursor-pointer bg-white transition-colors">
                              <Camera className="w-4 h-4 text-dark-400 mb-0.5" />
                              <span className="text-[8px] font-bold uppercase text-dark-500">Subir</span>
                              <input type="file" accept="image/*" onChange={ev => handleAddFoto(m.id, ev.target.files[0])} className="hidden" />
                            </label>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEstacion(m.id)}
                            disabled={edit.saving}
                            className="btn-primary flex-1 text-xs py-1.5"
                          >
                            {edit.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : (edit.is_existing ? 'Actualizar' : 'Guardar Monitoreo')}
                          </button>
                          <button
                            onClick={() => setExpandedId(null)}
                            className="btn-secondary text-xs py-1.5 px-3"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Agregar nueva estación */}
      {canEdit && (
        <div className="pt-2 border-t border-dark-100">
          {!showNueva ? (
            <button
              type="button"
              onClick={() => setShowNueva(true)}
              className="flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-4 h-4" /> Agregar nueva estación al cliente
            </button>
          ) : (
            <form onSubmit={handleAddMaestra} className="bg-primary-50/50 p-3 rounded-xl border border-primary-100 space-y-3">
              <p className="text-xs font-bold text-primary-800">Crear Nueva Estación</p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={nuevaEstacion.tipo}
                  onChange={e => setNuevaEstacion({ ...nuevaEstacion, tipo: e.target.value })}
                  className="input-field text-sm bg-white"
                >
                  {DEFAULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Número (ej. 01, 10A)"
                  value={nuevaEstacion.numero}
                  onChange={e => setNuevaEstacion({ ...nuevaEstacion, numero: e.target.value })}
                  className="input-field text-sm bg-white"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Ubicación (Opcional)"
                value={nuevaEstacion.ubicacion}
                onChange={e => setNuevaEstacion({ ...nuevaEstacion, ubicacion: e.target.value })}
                className="input-field text-sm bg-white"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={savingNueva} className="btn-primary flex-1 text-xs py-1.5">
                  {savingNueva ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Crear y Añadir'}
                </button>
                <button type="button" onClick={() => setShowNueva(false)} className="btn-secondary text-xs py-1.5 px-3">Cancelar</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
