import { useState, useEffect } from 'react'
import { Plus, Trash2, Camera, ArrowLeft, Upload, Loader2, Save, Droplets, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import { confirmDelete, successAlert } from '../../../lib/alerts'
import { getAuthImageUrl } from '../../../utils/imageUtils'
import { generateUUID } from '../../../utils/uuid'

const EVENTOS_TANQUE = ['INICIO', 'HALLAZGO', 'DURANTE', 'DESINFECCION', 'ENJUAGUE', 'FINAL']
const MATERIALES = ['Concreto', 'Polietileno', 'Fibra de vidrio', 'Acero inoxidable', 'Metálico', 'Otro']
const TIPOS_TANQUE = ['Elevado', 'Subterráneo', 'A Nivel', 'Superficial']

const EVENTO_COLORS = {
  INICIO:      'bg-blue-500',
  HALLAZGO:    'bg-amber-500',
  DURANTE:     'bg-indigo-500',
  DESINFECCION:'bg-purple-500',
  ENJUAGUE:    'bg-cyan-500',
  FINAL:       'bg-emerald-500',
}

function getTanqueGradient(index) {
  const gradients = [
    'from-cyan-600 to-blue-700 border-cyan-400/30 shadow-cyan-500/10',
    'from-blue-600 to-indigo-700 border-blue-400/30 shadow-blue-500/10',
    'from-teal-600 to-cyan-700 border-teal-400/30 shadow-teal-500/10',
    'from-indigo-600 to-violet-700 border-indigo-400/30 shadow-indigo-500/10',
    'from-sky-600 to-blue-800 border-sky-400/30 shadow-sky-500/10',
  ]
  return gradients[index % gradients.length]
}

export default function OrdenLavadoTanques({ 
  ordenId, 
  isAssignedTecnico, 
  isAdmin,
  ordenEstado, 
  queuePhoto,
  queueOrExecute,
  actividades,
  setActividades 
}) {
  const [tanques, setTanques] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTanque, setSelectedTanque] = useState(null) // tanque completo seleccionado
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [editingTanque, setEditingTanque] = useState(null)

  const canEdit = isAssignedTecnico && ordenEstado === 'en_progreso'
  const canManageTanks = isAdmin
  const token = localStorage.getItem('token')

  useEffect(() => {
    loadTanques()
  }, [ordenId])

  async function loadTanques() {
    try {
      const res = await api.get(`/ordenes/${ordenId}/tanques`, { token })
      const data = res.data || []
      setTanques(data)
    } catch (err) {
      toast.error('Error al cargar tanques')
    } finally {
      setLoading(false)
    }
  }

  // Mantener selectedTanque sincronizado cuando cambia el estado de tanques
  function syncSelectedTanque(updatedTanques) {
    setTanques(updatedTanques)
    if (selectedTanque) {
      const updated = updatedTanques.find(t => t.id === selectedTanque.id)
      if (updated) setSelectedTanque(updated)
    }
  }

  // --- CRUD TANQUES ---
  async function handleAddTanque() {
    try {
      const num = tanques.length + 1
      const res = await api.post('/tanques', {
        orden_id: ordenId,
        numero: `TQ-${String(num).padStart(3, '0')}`,
        nombre: `Tanque ${num}`
      }, { token })
      const newTanque = { ...res.data, bitacora: [] }
      const updatedTanques = [...tanques, newTanque]
      setTanques(updatedTanques)
      setSelectedTanque(newTanque)
      setEditingTanque(newTanque.id)

      if (queueOrExecute) {
        const actividadPayload = {
          id: generateUUID(),
          orden_id: ordenId,
          descripcion: `Lavado de tanques: Nuevo tanque registrado (${newTanque.numero})`,
          created_at: new Date().toISOString()
        }
        const { data } = await queueOrExecute('actividades_servicio', 'insert', actividadPayload, ordenId)
        if (setActividades && actividades) setActividades([data[0] || actividadPayload, ...actividades])
      }
    } catch (err) {
      toast.error('Error al agregar tanque')
    }
  }

  async function handleDeleteTanque(id) {
    if (!await confirmDelete('¿Eliminar tanque?', 'Se borrará toda su bitácora y fotos.')) return
    try {
      await api.delete(`/tanques/${id}`, { token })
      const filtered = tanques.filter(t => t.id !== id)
      setTanques(filtered)
      if (selectedTanque?.id === id) setSelectedTanque(null)
    } catch (err) {
      toast.error('Error al eliminar tanque')
    }
  }

  async function handleSaveTanqueInfo(tanque) {
    try {
      const res = await api.put(`/tanques/${tanque.id}`, tanque, { token })
      const updated = tanques.map(t => t.id === tanque.id ? { ...res.data, bitacora: t.bitacora } : t)
      syncSelectedTanque(updated)
      setEditingTanque(null)
      toast.success('Ficha guardada')

      if (queueOrExecute) {
        const actividadPayload = {
          id: generateUUID(),
          orden_id: ordenId,
          descripcion: `Lavado de tanques: Ficha técnica guardada para tanque ${tanque.numero || ''}`,
          created_at: new Date().toISOString()
        }
        const { data } = await queueOrExecute('actividades_servicio', 'insert', actividadPayload, ordenId)
        if (setActividades && actividades) setActividades([data[0] || actividadPayload, ...actividades])
      }
    } catch (err) {
      toast.error('Error al guardar ficha')
    }
  }

  async function handleUploadFotoTanque(e, tanqueId) {
    if (!e.target.files || !e.target.files.length) return
    const file = e.target.files[0]
    setUploadingFoto(tanqueId)
    toast.loading('Subiendo foto general...', { id: 'upload-gen' })
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const path = `evidencias/tqgen_${tanqueId}_${Date.now()}_${safeName}`
      const dbPayload = { 
        id: generateUUID(), orden_id: ordenId,
        storage_path: path, descripcion: 'Foto General Tanque'
      }
      const { publicUrl } = await queuePhoto('fotos-servicio', path, file, file.type, 'fotos_servicio', dbPayload, ordenId)
      const res = await api.put(`/tanques/${tanqueId}`, { foto_url: publicUrl }, { token })
      const updated = tanques.map(t => t.id === tanqueId ? { ...res.data, bitacora: t.bitacora } : t)
      syncSelectedTanque(updated)
      toast.success('Foto guardada')
    } catch (err) {
      toast.error('Error al subir foto')
    } finally {
      setUploadingFoto(null)
      toast.dismiss('upload-gen')
      if (e.target) e.target.value = null
    }
  }

  // --- CRUD BITACORA ---
  async function handleAddEvento(tanqueId) {
    const defaultEvent = EVENTOS_TANQUE[0]
    try {
      const res = await api.post('/bitacora-tanques', {
        tanque_id: tanqueId, tipo_evento: defaultEvent, descripcion: ''
      }, { token })
      const newEvento = { ...res.data, fotos: [] }
      const updated = tanques.map(t => {
        if (t.id === tanqueId) return { ...t, bitacora: [...t.bitacora, newEvento] }
        return t
      })
      syncSelectedTanque(updated)

      if (queueOrExecute) {
        const tanque = tanques.find(t => t.id === tanqueId)
        const actividadPayload = {
          id: generateUUID(), orden_id: ordenId,
          descripcion: `Lavado de tanques: Evento añadido (${defaultEvent}) en tanque ${tanque?.numero || ''}`,
          created_at: new Date().toISOString()
        }
        const { data } = await queueOrExecute('actividades_servicio', 'insert', actividadPayload, ordenId)
        if (setActividades && actividades) setActividades([data[0] || actividadPayload, ...actividades])
      }
    } catch (err) {
      toast.error('Error al agregar evento')
    }
  }

  async function handleUpdateEvento(evento, field, value) {
    try {
      await api.put(`/bitacora-tanques/${evento.id}`, { [field]: value }, { token })
      const updated = tanques.map(t => {
        if (t.id === evento.tanque_id) {
          return { ...t, bitacora: t.bitacora.map(b => b.id === evento.id ? { ...b, [field]: value } : b) }
        }
        return t
      })
      syncSelectedTanque(updated)
    } catch (err) {
      toast.error('Error al actualizar evento')
    }
  }

  async function handleDeleteEvento(evento) {
    if (!await confirmDelete('¿Eliminar evento?', 'Se borrarán sus fotos asociadas.')) return
    try {
      await api.delete(`/bitacora-tanques/${evento.id}`, { token })
      const updated = tanques.map(t => {
        if (t.id === evento.tanque_id) return { ...t, bitacora: t.bitacora.filter(b => b.id !== evento.id) }
        return t
      })
      syncSelectedTanque(updated)
    } catch (err) {
      toast.error('Error al eliminar evento')
    }
  }

  async function handleUploadFotoEvento(e, evento) {
    if (!e.target.files || !e.target.files.length) return
    const files = Array.from(e.target.files)
    setUploadingFoto(evento.id)
    toast.loading('Subiendo fotos...', { id: 'upload-evt' })
    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const path = `evidencias/evtq_${evento.id}_${Date.now()}_${safeName}`
        const dbPayload = { id: generateUUID(), orden_id: ordenId, storage_path: path, descripcion: 'Evidencia de tanque' }
        const { publicUrl } = await queuePhoto('fotos-servicio', path, file, file.type, 'fotos_servicio', dbPayload, ordenId)
        const res = await api.post('/fotos-bitacora-tanques', {
          bitacora_id: evento.id, url: publicUrl, storage_path: path
        }, { token })
        const updated = tanques.map(t => {
          if (t.id === evento.tanque_id) {
            return {
              ...t, bitacora: t.bitacora.map(b => {
                if (b.id === evento.id) return { ...b, fotos: [...b.fotos, res.data] }
                return b
              })
            }
          }
          return t
        })
        syncSelectedTanque(updated)
      }
      toast.success('Fotos guardadas')
    } catch (err) {
      toast.error('Error al subir fotos')
    } finally {
      setUploadingFoto(null)
      toast.dismiss('upload-evt')
      if (e.target) e.target.value = null
    }
  }

  async function handleDeleteFotoEvento(foto, evento) {
    if (!await confirmDelete('¿Eliminar foto?')) return
    try {
      await api.delete(`/fotos-bitacora-tanques/${foto.id}`, { token })
      const updated = tanques.map(t => {
        if (t.id === evento.tanque_id) {
          return {
            ...t, bitacora: t.bitacora.map(b => {
              if (b.id === evento.id) return { ...b, fotos: b.fotos.filter(f => f.id !== foto.id) }
              return b
            })
          }
        }
        return t
      })
      syncSelectedTanque(updated)
    } catch (err) {
      toast.error('Error al eliminar foto')
    }
  }

  if (loading) return (
    <div className="p-10 text-center">
      <Droplets className="w-8 h-8 text-cyan-400 mx-auto mb-2 animate-pulse" />
      <p className="text-sm text-dark-400">Cargando tanques...</p>
    </div>
  )

  // ─── VISTA: DETALLE DE TANQUE SELECCIONADO ────────────────────────────────
  if (selectedTanque) {
    const tanque = selectedTanque
    const isEditing = editingTanque === tanque.id

    return (
      <div className="space-y-5">
        {/* Barra de navegación de regreso */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-dark-100 shadow-xs">
          <button
            type="button"
            onClick={() => { setSelectedTanque(null); setEditingTanque(null) }}
            className="text-xs font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la lista de tanques
          </button>
          <span className="text-xs font-semibold text-dark-400 hidden sm:inline">
            {tanque.numero} — {tanque.nombre}
          </span>
        </div>

        {/* Card del tanque con gradiente */}
        <div className={`bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl p-4 text-white flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/20">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-100">{tanque.numero}</p>
              <h3 className="font-black text-lg">{tanque.nombre}</h3>
              {tanque.ubicacion && <p className="text-xs text-cyan-100">{tanque.ubicacion}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-cyan-100 uppercase tracking-wider">Bitácora</p>
            <p className="text-2xl font-black">{tanque.bitacora?.length ?? 0}</p>
            <p className="text-xs text-cyan-100">eventos</p>
          </div>
        </div>

        {/* FICHA TÉCNICA */}
        <div className="bg-white rounded-2xl border border-dark-100 shadow-xs overflow-hidden">
          <div className="bg-cyan-50 px-4 py-3 flex justify-between items-center border-b border-cyan-100">
            <h4 className="font-bold text-cyan-900 text-sm uppercase tracking-wider">Ficha del Tanque</h4>
            <div>
              {canEdit && !isEditing && (
                <button onClick={() => setEditingTanque(tanque.id)} className="text-cyan-600 text-sm hover:underline font-medium">
                  Editar Ficha
                </button>
              )}
              {canEdit && isEditing && (
                <button onClick={() => handleSaveTanqueInfo(tanque)} className="text-white bg-cyan-600 px-3 py-1 rounded-lg text-sm flex items-center gap-1 hover:bg-cyan-700">
                  <Save className="w-4 h-4" /> Guardar
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Foto */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-dark-500 uppercase">Fotografía General</label>
                <div className="relative aspect-video bg-dark-100 rounded-xl border border-dark-200 overflow-hidden flex items-center justify-center">
                  {tanque.foto_url ? (
                    <img src={getAuthImageUrl(tanque.foto_url)} alt="Tanque" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-dark-300" />
                  )}
                  {canEdit && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer text-white flex flex-col items-center">
                        {uploadingFoto === tanque.id ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                        <span className="text-xs mt-1">Cambiar Foto</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadFotoTanque(e, tanque.id)} />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Datos */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isEditing ? (
                  <>
                    <div>
                      <label className="label-field">Número/Código</label>
                      <input type="text" className="input-field" value={tanque.numero || ''} onChange={e => setTanques(tanques.map(t => t.id === tanque.id ? { ...t, numero: e.target.value } : t))} />
                    </div>
                    <div>
                      <label className="label-field">Nombre</label>
                      <input type="text" className="input-field" value={tanque.nombre || ''} onChange={e => setTanques(tanques.map(t => t.id === tanque.id ? { ...t, nombre: e.target.value } : t))} />
                    </div>
                    <div>
                      <label className="label-field">Tipo de Tanque</label>
                      <select className="input-field" value={tanque.tipo_tanque || ''} onChange={e => setTanques(tanques.map(t => t.id === tanque.id ? { ...t, tipo_tanque: e.target.value } : t))}>
                        <option value="">Seleccione...</option>
                        {TIPOS_TANQUE.map(op => <option key={op} value={op}>{op}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-field">Material</label>
                      <select className="input-field" value={tanque.material || ''} onChange={e => setTanques(tanques.map(t => t.id === tanque.id ? { ...t, material: e.target.value } : t))}>
                        <option value="">Seleccione...</option>
                        {MATERIALES.map(op => <option key={op} value={op}>{op}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-2/3">
                        <label className="label-field">Capacidad</label>
                        <input type="number" className="input-field" value={tanque.capacidad_valor || ''} onChange={e => setTanques(tanques.map(t => t.id === tanque.id ? { ...t, capacidad_valor: e.target.value } : t))} />
                      </div>
                      <div className="w-1/3">
                        <label className="label-field">Unidad</label>
                        <select className="input-field" value={tanque.capacidad_unidad || ''} onChange={e => setTanques(tanques.map(t => t.id === tanque.id ? { ...t, capacidad_unidad: e.target.value } : t))}>
                          <option value="L">L</option>
                          <option value="m³">m³</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label-field">Ubicación</label>
                      <input type="text" className="input-field" value={tanque.ubicacion || ''} onChange={e => setTanques(tanques.map(t => t.id === tanque.id ? { ...t, ubicacion: e.target.value } : t))} />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs uppercase font-bold text-dark-400">Tipo y Material</p>
                      <p className="text-sm text-dark-800">{tanque.tipo_tanque || '-'} / {tanque.material || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold text-dark-400">Capacidad</p>
                      <p className="text-sm text-dark-800">{tanque.capacidad_valor ? `${tanque.capacidad_valor} ${tanque.capacidad_unidad || ''}` : '-'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs uppercase font-bold text-dark-400">Ubicación</p>
                      <p className="text-sm text-dark-800">{tanque.ubicacion || '-'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Botones admin */}
          {canManageTanks && (
            <div className="px-4 pb-4 flex justify-end">
              <button
                onClick={() => handleDeleteTanque(tanque.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" /> Eliminar Tanque
              </button>
            </div>
          )}
        </div>

        {/* BITÁCORA DE ACTIVIDADES */}
        <div className="bg-white rounded-2xl border border-dark-100 shadow-xs overflow-hidden">
          <div className="bg-dark-50 px-4 py-3 flex justify-between items-center border-b border-dark-100">
            <h4 className="font-bold text-dark-900 text-sm uppercase tracking-wider">Bitácora de Actividades</h4>
            {canEdit && (
              <button onClick={() => handleAddEvento(tanque.id)} className="text-primary-600 text-sm hover:underline font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> Nuevo Evento
              </button>
            )}
          </div>

          <div className="p-4">
            {tanque.bitacora?.length === 0 && (
              <div className="text-center py-8 text-dark-400 text-sm italic">
                No hay eventos registrados aún.
              </div>
            )}

            <div className="space-y-5 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-dark-100">
              {tanque.bitacora?.map(evento => (
                <div key={evento.id} className="relative pl-8">
                  <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full ${EVENTO_COLORS[evento.tipo_evento] || 'bg-primary-500'} z-10 flex items-center justify-center`}>
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>

                  <div className="bg-white border border-dark-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-dark-50 px-4 py-2 flex justify-between items-center border-b border-dark-100">
                      {canEdit ? (
                        <select
                          className="bg-transparent font-bold text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-1"
                          value={evento.tipo_evento}
                          onChange={e => handleUpdateEvento(evento, 'tipo_evento', e.target.value)}
                        >
                          {EVENTOS_TANQUE.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                      ) : (
                        <span className="font-bold text-sm text-dark-900">{evento.tipo_evento}</span>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-dark-400 font-medium">
                          {new Date(evento.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {canEdit && (
                          <button onClick={() => handleDeleteEvento(evento)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {canEdit ? (
                        <textarea
                          className="w-full text-sm text-dark-700 bg-transparent border-none focus:ring-0 p-0 resize-none h-20"
                          defaultValue={evento.descripcion}
                          onBlur={e => {
                            if (e.target.value !== evento.descripcion) {
                              handleUpdateEvento(evento, 'descripcion', e.target.value)
                            }
                          }}
                          placeholder="Descripción de la actividad..."
                        />
                      ) : (
                        <p className="text-sm text-dark-700 whitespace-pre-wrap">{evento.descripcion}</p>
                      )}

                      {/* Galería de Evento */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-dark-400 uppercase tracking-wider">Evidencias ({evento.fotos?.length || 0})</span>
                          {canEdit && (
                            <label className="cursor-pointer text-primary-600 text-xs font-bold flex items-center gap-1 hover:underline">
                              {uploadingFoto === evento.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                              Añadir foto
                              <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleUploadFotoEvento(e, evento)} />
                            </label>
                          )}
                        </div>
                        {evento.fotos?.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {evento.fotos.map(foto => (
                              <div key={foto.id} className="relative group aspect-square rounded-lg overflow-hidden bg-dark-100 border border-dark-200">
                                <a href={getAuthImageUrl(foto.url)} target="_blank" rel="noopener noreferrer">
                                  <img src={getAuthImageUrl(foto.url)} alt="Evidencia" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                </a>
                                {canEdit && (
                                  <button
                                    onClick={() => handleDeleteFotoEvento(foto, evento)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow"
                                  >
                                    <Trash2 className="w-3 h-3" />
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
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── VISTA: GRID DE TARJETAS POR TANQUE ──────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header con botón agregar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-base font-bold text-dark-900 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-500" />
            Tanques Registrados ({tanques.length})
          </h3>
          <p className="text-xs text-dark-400 mt-0.5">Selecciona un tanque para registrar su actividad</p>
        </div>
        {canManageTanks && (
          <button
            onClick={handleAddTanque}
            className="btn-primary py-2 px-4 text-sm rounded-xl flex items-center gap-1.5 shadow-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-0"
          >
            <Plus className="w-4 h-4" /> Agregar Tanque
          </button>
        )}
      </div>

      {/* Grid de tarjetas */}
      {tanques.length === 0 ? (
        <div className="text-center py-12 bg-dark-50 rounded-2xl border border-dashed border-dark-200">
          <Droplets className="w-10 h-10 text-cyan-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-dark-500">No hay tanques registrados</p>
          {canManageTanks && (
            <p className="text-xs text-dark-400 mt-1">Haz clic en "Agregar Tanque" para comenzar</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tanques.map((tanque, idx) => {
            const gradient = getTanqueGradient(idx)
            const eventosCount = tanque.bitacora?.length ?? 0
            const ultimoEvento = tanque.bitacora?.[tanque.bitacora.length - 1]
            const tieneInfo = tanque.tipo_tanque || tanque.material || tanque.capacidad_valor

            return (
              <div
                key={tanque.id}
                onClick={() => setSelectedTanque(tanque)}
                className={`group cursor-pointer bg-gradient-to-br ${gradient} rounded-3xl p-5 text-white shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[175px] border`}
              >
                {/* Brillo decorativo */}
                <div className="absolute right-3 top-3 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                      <Droplets className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm border ${
                      eventosCount > 0
                        ? 'bg-emerald-950/40 text-emerald-200 border-emerald-300/30'
                        : 'bg-white/20 text-white border-white/20'
                    }`}>
                      {eventosCount > 0 ? `${eventosCount} eventos` : 'Sin eventos'}
                    </span>
                  </div>

                  <h4 className="text-lg font-black tracking-tight">{tanque.nombre}</h4>
                  <p className="text-xs text-white/70 font-mono mt-0.5">{tanque.numero}</p>

                  <div className="mt-2 space-y-0.5">
                    {tieneInfo ? (
                      <>
                        {tanque.tipo_tanque && (
                          <p className="text-xs text-white/80">
                            <span className="text-white/60">Tipo:</span> {tanque.tipo_tanque}
                            {tanque.material ? ` · ${tanque.material}` : ''}
                          </p>
                        )}
                        {tanque.capacidad_valor && (
                          <p className="text-xs text-white/80">
                            <span className="text-white/60">Capacidad:</span> {tanque.capacidad_valor} {tanque.capacidad_unidad || ''}
                          </p>
                        )}
                        {tanque.ubicacion && (
                          <p className="text-xs text-white/80 line-clamp-1">
                            <span className="text-white/60">Ubicación:</span> {tanque.ubicacion}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-white/60 italic">Sin ficha técnica</p>
                    )}
                    {ultimoEvento && (
                      <p className="text-xs text-white/60 mt-1">
                        Último: <span className="text-white/80 font-semibold">{ultimoEvento.tipo_evento}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-white/15 mt-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1 group-hover:underline">
                    Ver actividades del tanque
                  </span>
                  <div className="w-7 h-7 rounded-full bg-white/20 group-hover:bg-white text-white group-hover:text-cyan-900 flex items-center justify-center transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
