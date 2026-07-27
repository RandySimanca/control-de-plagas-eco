import { useState, useEffect } from 'react'
import { Plus, Trash2, Camera, ChevronDown, ChevronRight, Upload, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import { confirmDelete, successAlert } from '../../../lib/alerts'
import { getAuthImageUrl } from '../../../utils/imageUtils'
import { generateUUID } from '../../../utils/uuid'

const EVENTOS_TANQUE = ['INICIO', 'HALLAZGO', 'DURANTE', 'DESINFECCION', 'ENJUAGUE', 'FINAL']
const MATERIALES = ['Concreto', 'Polietileno', 'Fibra de vidrio', 'Acero inoxidable', 'Metálico', 'Otro']
const TIPOS_TANQUE = ['Elevado', 'Subterráneo', 'Superficial']

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
  const [selectedTanqueId, setSelectedTanqueId] = useState(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [editingTanque, setEditingTanque] = useState(null) // ID del tanque en edición

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
      if (data.length > 0) {
        setSelectedTanqueId(data[0].id)
      }
    } catch (err) {
      toast.error('Error al cargar tanques')
    } finally {
      setLoading(false)
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
      setTanques([...tanques, newTanque])
      setSelectedTanqueId(newTanque.id)
      setEditingTanque(newTanque.id)

      // Generar actividad en la bitácora
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
      if (selectedTanqueId === id) {
        setSelectedTanqueId(filtered.length > 0 ? filtered[0].id : null)
      }
    } catch (err) {
      toast.error('Error al eliminar tanque')
    }
  }

  async function handleSaveTanqueInfo(tanque) {
    try {
      const res = await api.put(`/tanques/${tanque.id}`, tanque, { token })
      setTanques(tanques.map(t => t.id === tanque.id ? { ...res.data, bitacora: t.bitacora } : t))
      setEditingTanque(null)
      toast.success('Ficha guardada')

      // Generar actividad en la bitácora
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
        id: generateUUID(),
        orden_id: ordenId,
        storage_path: path,
        descripcion: 'Foto General Tanque'
      }
      
      const { publicUrl } = await queuePhoto('fotos-servicio', path, file, file.type, 'fotos_servicio', dbPayload, ordenId)
      
      const res = await api.put(`/tanques/${tanqueId}`, { foto_url: publicUrl }, { token })
      setTanques(tanques.map(t => t.id === tanqueId ? { ...res.data, bitacora: t.bitacora } : t))
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
        tanque_id: tanqueId,
        tipo_evento: defaultEvent,
        descripcion: ''
      }, { token })
      const newEvento = { ...res.data, fotos: [] }
      setTanques(tanques.map(t => {
        if (t.id === tanqueId) return { ...t, bitacora: [...t.bitacora, newEvento] }
        return t
      }))

      // Generar actividad
      if (queueOrExecute) {
        const tanque = tanques.find(t => t.id === tanqueId)
        const actividadPayload = {
          id: generateUUID(),
          orden_id: ordenId,
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
      const res = await api.put(`/bitacora-tanques/${evento.id}`, { [field]: value }, { token })
      setTanques(tanques.map(t => {
        if (t.id === evento.tanque_id) {
          return {
            ...t,
            bitacora: t.bitacora.map(b => b.id === evento.id ? { ...b, [field]: value } : b)
          }
        }
        return t
      }))
    } catch (err) {
      toast.error('Error al actualizar evento')
    }
  }

  async function handleDeleteEvento(evento) {
    if (!await confirmDelete('¿Eliminar evento?', 'Se borrarán sus fotos asociadas.')) return
    try {
      await api.delete(`/bitacora-tanques/${evento.id}`, { token })
      setTanques(tanques.map(t => {
        if (t.id === evento.tanque_id) {
          return { ...t, bitacora: t.bitacora.filter(b => b.id !== evento.id) }
        }
        return t
      }))
    } catch (err) {
      toast.error('Error al eliminar evento')
    }
  }

  // --- FOTOS BITACORA ---
  async function handleUploadFotoEvento(e, evento) {
    if (!e.target.files || !e.target.files.length) return
    const files = Array.from(e.target.files)
    setUploadingFoto(evento.id)
    toast.loading('Subiendo fotos...', { id: 'upload-evt' })
    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const path = `evidencias/evtq_${evento.id}_${Date.now()}_${safeName}`
        const dbPayload = { 
          id: generateUUID(),
          orden_id: ordenId, 
          storage_path: path,
          descripcion: 'Evidencia de tanque'
        }
        
        const { publicUrl } = await queuePhoto('fotos-servicio', path, file, file.type, 'fotos_servicio', dbPayload, ordenId)
        
        const res = await api.post('/fotos-bitacora-tanques', {
          bitacora_id: evento.id,
          url: publicUrl,
          storage_path: path
        }, { token })
        
        setTanques(tanques.map(t => {
          if (t.id === evento.tanque_id) {
            return {
              ...t,
              bitacora: t.bitacora.map(b => {
                if (b.id === evento.id) return { ...b, fotos: [...b.fotos, res.data] }
                return b
              })
            }
          }
          return t
        }))
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
      setTanques(tanques.map(t => {
        if (t.id === evento.tanque_id) {
          return {
            ...t,
            bitacora: t.bitacora.map(b => {
              if (b.id === evento.id) return { ...b, fotos: b.fotos.filter(f => f.id !== foto.id) }
              return b
            })
          }
        }
        return t
      }))
    } catch (err) {
      toast.error('Error al eliminar foto')
    }
  }

  if (loading) return <div className="p-8 text-center text-dark-500 animate-pulse">Cargando tanques...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-dark-900">Lavado de Tanques ({tanques.length})</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {tanques.length > 0 && (
            <select
              className="input bg-white w-full sm:w-64"
              value={selectedTanqueId || ''}
              onChange={(e) => setSelectedTanqueId(e.target.value)}
            >
              {tanques.map(t => (
                <option key={t.id} value={t.id}>{t.numero} - {t.nombre}</option>
              ))}
            </select>
          )}
          {canManageTanks && (
            <button onClick={handleAddTanque} className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          )}
        </div>
      </div>

      {tanques.filter(t => t.id === selectedTanqueId).map(tanque => {
        const isEditing = editingTanque === tanque.id

        return (
          <div key={tanque.id} className="card shadow-sm border border-dark-100 p-0 overflow-hidden">
            {/* Cabecera del Tanque Seleccionado */}
            <div className="bg-dark-50 p-4 flex items-center justify-between border-b border-dark-100">
              <div>
                <h3 className="font-bold text-dark-900">{tanque.numero} - {tanque.nombre}</h3>
                <p className="text-xs text-dark-500">
                  {tanque.capacidad_valor ? `${tanque.capacidad_valor} ${tanque.capacidad_unidad || ''}` : 'Capacidad no especificada'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canManageTanks && (
                  <button 
                    onClick={() => handleDeleteTanque(tanque.id)} 
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Eliminar Tanque</span>
                  </button>
                )}
              </div>
            </div>

            {/* Contenido (Siempre visible para el tanque seleccionado) */}
            <div className="p-4 bg-white space-y-6">
                
                {/* FICHA TÉCNICA */}
                <div className="bg-primary-50/50 p-4 rounded-xl border border-primary-100 relative">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-primary-900 text-sm">FICHA DEL TANQUE</h4>
                    {canEdit && !isEditing && (
                      <button onClick={() => setEditingTanque(tanque.id)} className="text-primary-600 text-sm hover:underline font-medium">Editar Ficha</button>
                    )}
                    {canEdit && isEditing && (
                      <button onClick={() => handleSaveTanqueInfo(tanque)} className="text-white bg-primary-600 px-3 py-1 rounded-md text-sm flex items-center gap-1 hover:bg-primary-700">
                        <Save className="w-4 h-4" /> Guardar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Foto General */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-dark-500 uppercase">Fotografía General</label>
                      <div className="relative aspect-video bg-dark-100 rounded-lg border border-dark-200 overflow-hidden flex items-center justify-center">
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

                {/* BITÁCORA DEL TANQUE */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-dark-900 text-sm">BITÁCORA DE ACTIVIDADES</h4>
                    {canEdit && (
                      <button onClick={() => handleAddEvento(tanque.id)} className="text-primary-600 text-sm hover:underline font-medium flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Nuevo Evento
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-dark-100">
                    {tanque.bitacora.length === 0 && (
                      <p className="text-sm text-dark-400 pl-8 italic">No hay eventos registrados.</p>
                    )}
                    
                    {tanque.bitacora.map(evento => (
                      <div key={evento.id} className="relative pl-8">
                        <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-[3px] border-primary-500 z-10" />
                        
                        <div className="bg-white border border-dark-200 rounded-xl overflow-hidden shadow-sm">
                          {/* Evento Header */}
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

                          {/* Evento Body */}
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
                                <span className="text-xs font-bold text-dark-400 uppercase tracking-wider">Evidencias ({evento.fotos.length})</span>
                                {canEdit && (
                                  <label className="cursor-pointer text-primary-600 text-xs font-bold flex items-center gap-1 hover:underline">
                                    {uploadingFoto === evento.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                                    Añadir foto
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleUploadFotoEvento(e, evento)} />
                                  </label>
                                )}
                              </div>
                              
                              {evento.fotos.length > 0 && (
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
      })}
    </div>
  )
}
