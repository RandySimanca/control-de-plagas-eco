import { useState, useEffect } from 'react'
import { Package, Camera, X, Loader2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAuthImageUrl } from '../../../utils/imageUtils'
import { generateUUID } from '../../../utils/uuid'
import db from '../../../lib/db'
import api from '../../../lib/api'

const DEFAULT_TYPES = ['Cebadero', 'Impacto', 'Jaula atrapavivos']

export default function OrdenEstaciones({ ordenId, clienteId, estaciones, setEstaciones, isAssignedTecnico, ordenEstado, isOnline, queueOrExecute, queuePhoto }) {
  const [maestras, setMaestras] = useState([])
  const [loadingMaestras, setLoadingMaestras] = useState(true)
  
  // Estado del formulario de nueva estación
  const [showNueva, setShowNueva] = useState(false)
  const [nuevaEstacion, setNuevaEstacion] = useState({ tipo: 'Cebadero', numero: '', ubicacion: '' })

  // Estado del mantenimiento
  const [mantenimientoEdit, setMantenimientoEdit] = useState({})
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadMaestras() {
      try {
        if (isOnline) {
          const token = localStorage.getItem('token')
          const { data } = await api.get(`/clientes/${clienteId}/estaciones`, { token })
          setMaestras(data.data || [])
        } else {
          const snapshot = await db.ordenes.get(ordenId)
          if (snapshot && snapshot.estaciones_maestras) {
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

  function startEdit() {
    // Inicializar el estado de edición con las maestras
    const initial = {}
    maestras.forEach(m => {
      // Buscar si ya hay un mantenimiento en esta orden
      const existing = estaciones.find(e => e.estacion_id === m.id)
      initial[m.id] = {
        active: !!existing,
        observaciones: existing?.observaciones || '',
        es_nueva_instalacion: existing?.es_nueva_instalacion || false,
        fotos: existing?.fotos || [],
        id_usada: existing?.id || generateUUID(),
        is_existing: !!existing
      }
    })
    setMantenimientoEdit(initial)
    setIsEditing(true)
  }

  async function handleSaveMantenimiento() {
    setSaving(true)
    const token = localStorage.getItem('token')
    try {
      let nuevas = 0
      let mantenimientos = 0
      const toUpdate = []

      // Iterar sobre el estado de edición
      for (const mId of Object.keys(mantenimientoEdit)) {
        const edit = mantenimientoEdit[mId]
        const maestra = maestras.find(m => m.id === mId)
        
        if (edit.active) {
          if (edit.es_nueva_instalacion) nuevas++
          else mantenimientos++
        }

        if (edit.active && !edit.is_existing) {
          // INSERT nueva estación usada
          const dbPayload = {
            id: edit.id_usada,
            orden_id: ordenId,
            estacion_id: mId,
            tipo_estacion: maestra.tipo,
            cantidad: 1, // Ya no se usa para agregar cantidad, pero es obligatorio en la BD por compatibilidad
            observaciones: edit.observaciones,
            es_nueva_instalacion: edit.es_nueva_instalacion
          }
          await queueOrExecute('estaciones_usadas', 'insert', dbPayload, ordenId)
          toUpdate.push({ ...dbPayload, fotos: edit.fotos, numero_estacion: maestra.numero })
        } else if (edit.active && edit.is_existing) {
          // UPDATE existente
          const dbPayload = {
            id: edit.id_usada,
            observaciones: edit.observaciones,
            es_nueva_instalacion: edit.es_nueva_instalacion
          }
          await queueOrExecute('estaciones_usadas', 'update', dbPayload, ordenId)
          toUpdate.push({ ...estaciones.find(e => e.id === edit.id_usada), ...dbPayload, fotos: edit.fotos })
        } else if (!edit.active && edit.is_existing) {
          // DELETE 
          await queueOrExecute('estaciones_usadas', 'delete', { id: edit.id_usada }, ordenId)
        }
      }

      // Bitacora actividad
      if (nuevas > 0 || mantenimientos > 0) {
        let texto = 'Monitoreo de estaciones registrado.'
        if (nuevas > 0) texto += ` Instaladas: ${nuevas}.`
        if (mantenimientos > 0) texto += ` Revisadas: ${mantenimientos}.`
        
        await queueOrExecute('actividades_servicio', 'insert', {
          id: generateUUID(),
          orden_id: ordenId,
          descripcion: texto,
          created_at: new Date().toISOString()
        }, ordenId)
      }

      // Manejo fotos
      for (const mId of Object.keys(mantenimientoEdit)) {
        const edit = mantenimientoEdit[mId]
        if (!edit.active) continue
        
        const newFotos = edit.fotos.filter(f => !f.id || f.id.startsWith('temp_'))
        if (isOnline) {
          for (const foto of newFotos) {
            const fotoPayload = {
              estacion_usada_id: edit.id_usada,
              url: foto.url,
              storage_path: foto.storage_path,
              descripcion: foto.descripcion || ''
            }
            await api.post('/fotos-estaciones', fotoPayload, { token })
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
      }

      if (isOnline) {
        const data = await api.get('/estaciones-usadas', { params: { orden_id: ordenId }, token })
        setEstaciones(data.data || [])
      } else {
        setEstaciones(toUpdate)
      }

      setIsEditing(false)
      toast.success('Monitoreo guardado')
    } catch (err) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddMaestra(e) {
    e.preventDefault()
    if (!nuevaEstacion.numero) return toast.error('El número es obligatorio')
    
    setSaving(true)
    const mId = generateUUID()
    const payload = {
      id: mId,
      cliente_id: clienteId,
      numero: nuevaEstacion.numero,
      tipo: nuevaEstacion.tipo,
      ubicacion: nuevaEstacion.ubicacion
    }
    try {
      await queueOrExecute('estaciones', 'insert', payload, ordenId)
      setMaestras(prev => [...prev, { ...payload, estado: 'activa' }])
      setShowNueva(false)
      setNuevaEstacion({ tipo: 'Cebadero', numero: '', ubicacion: '' })
      toast.success('Estación creada. Ahora puede incluirla en el monitoreo.')
      
      if (isEditing) {
        setMantenimientoEdit(prev => ({
          ...prev,
          [mId]: {
            active: true,
            observaciones: '',
            es_nueva_instalacion: true,
            fotos: [],
            id_usada: generateUUID(),
            is_existing: false
          }
        }))
      }
    } catch (err) {
      toast.error('Error al crear estación')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddFoto(mId, file) {
    if (!file) return
    const maestra = maestras.find(m => m.id === mId)
    const path = `estaciones/orden_${ordenId}_${maestra.numero}_${Date.now()}.jpg`
    try {
      const { publicUrl, error } = await queuePhoto('fotos-servicio', path, file, file.type || 'image/jpeg')
      if (error) throw error
      
      const newFoto = {
        id: 'temp_' + generateUUID(),
        url: publicUrl,
        storage_path: path,
        descripcion: ''
      }
      
      setMantenimientoEdit(prev => ({
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
      setMantenimientoEdit(prev => ({
        ...prev,
        [mId]: { ...prev[mId], fotos: prev[mId].fotos.filter(f => f.id !== foto.id) }
      }))
      toast.success('Foto eliminada')
    } catch (err) {
      toast.error('Error al eliminar foto')
    }
  }

  const canEdit = isAssignedTecnico && ordenEstado === 'en_progreso'

  if (loadingMaestras) return <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary-600" /></div>

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-600" /> Trazabilidad de Estaciones
        </h2>
        {canEdit && !isEditing && (
          <button
            onClick={startEdit}
            className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 transition-colors"
          >
            Registrar Monitoreo
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Agrupamos maestras por tipo para mostrarlas */}
        {DEFAULT_TYPES.map(tipo => {
          const typeMaestras = maestras.filter(m => m.tipo === tipo)
          if (typeMaestras.length === 0 && !isEditing) return null
          
          return (
            <div key={tipo} className="mb-4">
              <h3 className="text-sm font-bold text-dark-700 mb-2 border-b pb-1">{tipo}s</h3>
              <div className="space-y-3">
                {typeMaestras.map(m => {
                  const editState = mantenimientoEdit[m.id]
                  const displayEstacion = estaciones.find(e => e.estacion_id === m.id)
                  
                  if (isEditing) {
                    return (
                      <div key={m.id} className={`p-3 rounded-xl border transition-all ${editState?.active ? 'bg-primary-50/30 border-primary-200' : 'bg-dark-50/50 border-dark-100 opacity-70'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editState?.active || false}
                              onChange={() => setMantenimientoEdit(prev => ({...prev, [m.id]: {...prev[m.id], active: !prev[m.id].active}}))}
                              className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="font-bold text-dark-900"># {m.numero}</span>
                          </label>
                        </div>
                        
                        {editState?.active && (
                          <div className="flex flex-col gap-2 pl-7">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-dark-700 w-max">
                              <input
                                type="checkbox"
                                checked={editState.es_nueva_instalacion}
                                onChange={(ev) => setMantenimientoEdit(prev => ({...prev, [m.id]: {...prev[m.id], es_nueva_instalacion: ev.target.checked}}))}
                                className="w-3.5 h-3.5 rounded border-dark-300 text-primary-600"
                              />
                              Nueva Instalación
                            </label>
                            
                            <textarea
                              placeholder="Observaciones de mantenimiento..."
                              value={editState.observaciones}
                              onChange={(ev) => setMantenimientoEdit(prev => ({...prev, [m.id]: {...prev[m.id], observaciones: ev.target.value}}))}
                              className="input-field text-sm bg-white"
                              rows={2}
                            />
                            
                            <div className="mt-2">
                              <p className="text-[10px] font-bold text-dark-400 uppercase mb-1">Evidencias ({editState.fotos.length})</p>
                              <div className="grid grid-cols-4 gap-2">
                                {editState.fotos.map((foto, fIdx) => (
                                  <div key={foto.id || fIdx} className="relative aspect-video rounded border border-dark-200 bg-white overflow-hidden group">
                                    <img src={getAuthImageUrl(foto.url)} className="w-full h-full object-cover" alt="Evidencia" />
                                    <button type="button" onClick={() => handleDeleteFoto(m.id, foto)} className="absolute top-0 right-0 p-0.5 bg-red-500 text-white opacity-90"><X className="w-3 h-3" /></button>
                                  </div>
                                ))}
                                <label className="aspect-video rounded border border-dashed border-dark-300 hover:border-primary-500 flex flex-col items-center justify-center cursor-pointer bg-white">
                                  <Camera className="w-4 h-4 text-dark-400 mb-0.5" />
                                  <span className="text-[8px] font-bold uppercase text-dark-500">Subir</span>
                                  <input type="file" accept="image/*" onChange={(ev) => handleAddFoto(m.id, ev.target.files[0])} className="hidden" />
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  } else {
                    // Vista lectura
                    if (!displayEstacion) return null
                    return (
                      <div key={m.id} className="bg-white p-3 rounded-xl border border-dark-100 flex flex-col gap-2 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-dark-900"># {m.numero}</span>
                          {displayEstacion.es_nueva_instalacion && (
                            <span className="text-[9px] font-bold bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Nueva</span>
                          )}
                        </div>
                        {displayEstacion.observaciones && <p className="text-xs text-dark-600 italic bg-dark-50 p-2 rounded">{displayEstacion.observaciones}</p>}
                        {displayEstacion.fotos?.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mt-1">
                            {displayEstacion.fotos.map((foto, fIdx) => (
                              <img key={fIdx} src={getAuthImageUrl(foto.url)} className="rounded w-full aspect-video object-cover border border-dark-100" />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }
                })}
              </div>
            </div>
          )
        })}

        {estaciones.length === 0 && !isEditing && (
          <div className="text-center py-6 bg-dark-50 rounded-xl border border-dashed border-dark-200">
            <p className="text-xs text-dark-400">No se ha registrado monitoreo</p>
          </div>
        )}

        {isEditing && (
          <div className="mt-6 pt-4 border-t border-dark-100 space-y-4">
            {!showNueva ? (
              <button type="button" onClick={() => setShowNueva(true)} className="flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700">
                <Plus className="w-4 h-4" /> Agregar nueva estación al cliente
              </button>
            ) : (
              <form onSubmit={handleAddMaestra} className="bg-primary-50/50 p-3 rounded-xl border border-primary-100 space-y-3">
                <p className="text-xs font-bold text-primary-800">Crear Nueva Estación</p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={nuevaEstacion.tipo} onChange={e => setNuevaEstacion({...nuevaEstacion, tipo: e.target.value})} className="input-field text-sm bg-white">
                    {DEFAULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="text" placeholder="Número (ej. 01, 10A)" value={nuevaEstacion.numero} onChange={e => setNuevaEstacion({...nuevaEstacion, numero: e.target.value})} className="input-field text-sm bg-white" required />
                </div>
                <input type="text" placeholder="Ubicación (Opcional)" value={nuevaEstacion.ubicacion} onChange={e => setNuevaEstacion({...nuevaEstacion, ubicacion: e.target.value})} className="input-field text-sm bg-white" />
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="btn-primary flex-1 text-xs py-1.5">Crear y Añadir</button>
                  <button type="button" onClick={() => setShowNueva(false)} className="btn-secondary text-xs py-1.5 px-3">Cancelar</button>
                </div>
              </form>
            )}

            <div className="flex gap-2">
              <button onClick={handleSaveMantenimiento} disabled={saving} className="btn-primary flex-1 py-2 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Guardar Monitoreo'}
              </button>
              <button onClick={() => setIsEditing(false)} className="btn-secondary py-2 text-sm">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
