import { useState, useEffect, useCallback } from 'react'
import { Package, Camera, X, Loader2, Plus, CheckCircle2, Circle, ChevronDown, ChevronUp, AlertCircle, MapPinned, ImagePlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAuthImageUrl } from '../../../utils/imageUtils'
import { generateUUID } from '../../../utils/uuid'
import db from '../../../lib/db'
import api from '../../../lib/api'
import { listPlanos, createPlano, deletePlano, updateEstacionCliente } from '../../../api/clientes.api'
import Modal from '../../ui/Modal'
import PlanoEstaciones from '../PlanoEstaciones'
import { compressImage } from '../../../utils/imageCompressor'

const DEFAULT_TYPES = ['Cebadero', 'Impacto', 'Jaula atrapavivos']

export default function OrdenEstaciones({ ordenId, clienteId, sedeId, estaciones, setEstaciones, isAssignedTecnico, isAdmin, ordenEstado, isOnline, queueOrExecute, queuePhoto }) {
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

  // Estado para planos
  const [planos, setPlanos] = useState([])
  const [showPlanoModal, setShowPlanoModal] = useState(false)
  const [planoSeleccionado, setPlanoSeleccionado] = useState(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadForm, setUploadForm] = useState({ nombre: '', origen: 'foto_croquis', file: null })
  const [uploading, setUploading] = useState(false)
  const [locateMode, setLocateMode] = useState(null)
  const [estacionSeleccionadaId, setEstacionSeleccionadaId] = useState(null)

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

  // Cargar planos de la sede
  useEffect(() => {
    async function loadPlanos() {
      if (!clienteId || !isOnline) return
      try {
        const token = localStorage.getItem('token')
        const res = await listPlanos(clienteId, token, sedeId)
        setPlanos(res.data || [])
      } catch (err) {
        console.error('Error cargando planos', err)
        setPlanos([])
      }
    }
    loadPlanos()
  }, [clienteId, sedeId, isOnline])

  useEffect(() => {
    async function loadMaestras() {
      try {
        if (isOnline) {
          const token = localStorage.getItem('token')
          // Filtrar maestras por sede si la orden tiene una sede asignada
          const params = sedeId ? { sede_id: sedeId } : {}
          const { data } = await api.get(`/clientes/${clienteId}/estaciones`, { token, params })
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
  }, [clienteId, sedeId, isOnline, ordenId])

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
        sede_id: sedeId || null,
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
      // Si hay un plano abierto, seleccionar la nueva estación para ubicarla
      if (showPlanoModal && planoSeleccionado) {
        setEstacionSeleccionadaId(mId)
      }
      toast.success('Estación creada. Completa el monitoreo y guarda.')
    } catch (err) {
      toast.error('Error al crear estación')
    } finally {
      setSavingNueva(false)
    }
  }

  // --- Gestión de planos ---

  async function handleSubirPlano(e) {
    e.preventDefault()
    if (!uploadForm.file) return toast.error('Selecciona una imagen')
    const nombre = uploadForm.nombre.trim() || 'Croquis de la visita'
    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      const comprimida = await compressImage(uploadForm.file)
      const ext = (comprimida.name.split('.').pop() || 'jpg').toLowerCase()
      const filePath = `${clienteId}/${sedeId || 'sin-sede'}/${ordenId}_${Date.now()}.${ext}`

      const formData = new FormData()
      formData.append('file', comprimida)
      formData.append('path', filePath)
      formData.append('bucket', 'planos')

      const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}))
        throw new Error(errData.message || errData.error || 'Error subiendo la imagen')
      }
      const { publicUrl } = await uploadRes.json()

      const { data } = await createPlano(clienteId, {
        nombre,
        origen: uploadForm.origen,
        imagen_url: publicUrl,
        storage_path: `planos/${filePath}`,
        sede_id: sedeId || null
      }, token)

      setPlanos(prev => [data, ...prev])
      setUploadForm({ nombre: '', origen: 'foto_croquis', file: null })
      setShowUploadForm(false)
      setLocateMode('subir')
      toast.success('Croquis guardado')
    } catch (err) {
      toast.error('Error al subir croquis: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDeletePlano(planoId) {
    if (!confirm('¿Eliminar este croquis? Las estaciones perderán su posición.')) return
    try {
      const token = localStorage.getItem('token')
      await deletePlano(clienteId, planoId, token)
      setPlanos(prev => prev.filter(p => p.id !== planoId))
      toast.success('Croquis eliminado')
    } catch (err) {
      toast.error('Error al eliminar croquis: ' + err.message)
    }
  }

  function abrirPlano(plano) {
    setPlanoSeleccionado(plano)
    const estacionesFiltradas = plano.sede_id
      ? maestras.filter(e => e.sede_id === plano.sede_id)
      : maestras.filter(e => e.cliente_id === clienteId)
    const sinUbicar = estacionesFiltradas.find(e => e.pos_x == null || e.pos_y == null)
    setEstacionSeleccionadaId(sinUbicar?.id || estacionesFiltradas[0]?.id || null)
    setLocateMode('ver')
    setShowPlanoModal(true)
  }

  async function handleMoverEstacion(estacionId, x, y) {
    if (!planoSeleccionado) return
    try {
      const token = localStorage.getItem('token')
      const { data } = await updateEstacionCliente(clienteId, estacionId, {
        plano_id: planoSeleccionado.id,
        pos_x: x,
        pos_y: y
      }, token)
      // Actualizar estaciones maestras localmente
      setMaestras(prev => prev.map(e => e.id === estacionId ? { ...e, ...data } : e))
      toast.success('Posición guardada')
    } catch (err) {
      toast.error('No se pudo guardar la posición: ' + err.message)
    }
  }

  function handleSeleccionarEstacion(estacion) {
    setEstacionSeleccionadaId(estacion.id)
  }

  function handlePinClick(estacion) {
    setEstacionSeleccionadaId(estacion.id)
    setExpandedId(estacion.id)
    setShowPlanoModal(false)
  }

  const canEdit = isAdmin || (isAssignedTecnico && ordenEstado === 'en_progreso')

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
        <div className="flex items-center gap-2">
          {planos.length > 0 && (
            <button
              onClick={() => abrirPlano(planos[0])}
              className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700"
            >
              <MapPinned className="w-3.5 h-3.5" /> Ver en plano
            </button>
          )}
          <span className="text-xs text-dark-400 bg-dark-50 px-2 py-1 rounded-full">
            {estaciones.length}/{maestras.length} monitoreadas
          </span>
        </div>
      </div>

      {/* Gestión de planos (técnico) */}
      {canEdit && (
        <div className="bg-primary-50/30 p-3 rounded-xl border border-primary-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-primary-800 flex items-center gap-1">
              <MapPinned className="w-3.5 h-3.5" /> Croquis del sitio
            </span>
            <button
              onClick={() => {
                setShowUploadForm(!showUploadForm)
                setUploadForm({ nombre: '', origen: 'foto_croquis', file: null })
              }}
              className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700"
            >
              <ImagePlus className="w-3.5 h-3.5" /> {showUploadForm ? 'Cancelar' : 'Subir croquis o Plano'}
            </button>
          </div>

          {showUploadForm && (
            <form onSubmit={handleSubirPlano} className="bg-white p-2 rounded-lg border border-primary-200 mb-2 space-y-2">
              <input
                type="text"
                className="input-field text-sm bg-white"
                placeholder="Nombre del croquis"
                value={uploadForm.nombre}
                onChange={e => setUploadForm({ ...uploadForm, nombre: e.target.value })}
              />
              <select
                className="input-field text-sm bg-white"
                value={uploadForm.origen}
                onChange={e => setUploadForm({ ...uploadForm, origen: e.target.value })}
              >
                <option value="foto_croquis">Foto de croquis a mano</option>
                <option value="plano">Plano del cliente</option>
              </select>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="input-field text-sm bg-white"
                onChange={e => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
              />
              <div className="flex gap-2">
                <button type="submit" disabled={uploading} className="btn-primary text-xs">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
                </button>
                <button type="button" onClick={() => {
                  setShowUploadForm(false)
                  setUploadForm({ nombre: '', origen: 'foto_croquis', file: null })
                }} className="btn-secondary text-xs">Cancelar</button>
              </div>
            </form>
          )}

          {planos.length === 0 && !showUploadForm && (
            <p className="text-xs text-dark-400 italic">No hay croquis para esta visita</p>
          )}

          {planos.length > 0 && (
            <div className="space-y-1">
              {planos.map(plano => (
                <div key={plano.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPinned className="w-4 h-4 text-primary-500" />
                    <span className="text-xs font-medium text-dark-800">{plano.nombre}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => abrirPlano(plano)}
                      className="text-xs flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                    >
                      Ver/Ubicar
                    </button>
                    <button
                      onClick={() => handleDeletePlano(plano.id)}
                      className="p-1 text-dark-400 hover:text-red-600 rounded"
                      title="Eliminar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                    className={`rounded-xl border transition-all overflow-hidden ${registered
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

      {/* Modal del plano */}
      {showPlanoModal && planoSeleccionado && (
        <Modal
          isOpen={showPlanoModal}
          onClose={() => setShowPlanoModal(false)}
          title={`Croquis - ${planoSeleccionado.nombre}`}
          maxWidth="max-w-4xl"
        >
          <div className="flex flex-col gap-4">
            {canEdit && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-600">
                  Estación seleccionada: <strong>{maestras.find(e => e.id === estacionSeleccionadaId)?.numero || '-'}</strong>
                </span>
                <select
                  className="input-field text-sm w-40"
                  value={estacionSeleccionadaId || ''}
                  onChange={e => setEstacionSeleccionadaId(e.target.value || null)}
                >
                  <option value="">Seleccionar estación</option>
                  {maestras
                    .filter(e => planoSeleccionado.sede_id ? e.sede_id === planoSeleccionado.sede_id : e.cliente_id === clienteId)
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.numero} - {e.tipo || e.tipo_estacion || 'Sin tipo'}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <PlanoEstaciones
              plano={planoSeleccionado}
              estaciones={maestras.filter(e => planoSeleccionado.sede_id ? e.sede_id === planoSeleccionado.sede_id : e.cliente_id === clienteId).map(e => {
                const usada = estaciones.find(us => us.estacion_id === e.id)
                return { ...e, _estado_visita: usada ? 'revisada' : (e.id === estacionSeleccionadaId ? 'seleccionada' : 'sin_revisar') }
              })}
              modo={canEdit ? 'editar' : 'ver'}
              estacionSeleccionadaId={estacionSeleccionadaId}
              onMover={canEdit ? handleMoverEstacion : undefined}
              onSeleccionar={handleSeleccionarEstacion}
              onAbrir={handlePinClick}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
