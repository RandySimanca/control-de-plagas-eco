import { useState } from 'react'
import { Package, Camera, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAuthImageUrl } from '../../../utils/imageUtils'
import { generateUUID } from '../../../utils/uuid'
import db from '../../../lib/db'
import api from '../../../lib/api'

const DEFAULT_TYPES = ['Cebadero', 'Impacto', 'Jaula atrapavivos']

function buildInitialEdit(estaciones) {
  return DEFAULT_TYPES.map(type => {
    const found = estaciones.find(e => e.tipo_estacion === type)
    return {
      tipo_estacion: type,
      cantidad: found ? found.cantidad : 0,
      observaciones: found ? found.observaciones : '',
      es_nueva_instalacion: found ? !!found.es_nueva_instalacion : false,
      fotos: found ? (found.fotos || []) : [],
      id: found ? found.id : null,
      active: !!found
    }
  })
}

export default function OrdenEstaciones({ ordenId, estaciones, setEstaciones, isAssignedTecnico, ordenEstado, isOnline, queueOrExecute, queuePhoto }) {
  const [estacionesEdit, setEstacionesEdit] = useState(() => buildInitialEdit(estaciones))
  const [isEditingEstaciones, setIsEditingEstaciones] = useState(false)
  const [savingEstaciones, setSavingEstaciones] = useState(false)

  async function handleSaveEstaciones() {
    setSavingEstaciones(true)
    const token = localStorage.getItem('token')
    try {
      const toInsert = estacionesEdit.filter(e => e.active).map(e => ({
        id: e.id || generateUUID(),
        orden_id: ordenId,
        tipo_estacion: e.tipo_estacion,
        cantidad: parseInt(e.cantidad) || 0,
        observaciones: e.observaciones || '',
        es_nueva_instalacion: e.es_nueva_instalacion,
        fotos: e.fotos
      }))

      await queueOrExecute('estaciones_usadas', 'delete_where', { filter: 'orden_id', value: ordenId }, ordenId)

      // Generar actividad automática en la bitácora
      if (toInsert.length > 0) {
        let nuevas = 0
        let mantenimientos = 0
        toInsert.forEach(e => {
          if (e.es_nueva_instalacion) nuevas += e.cantidad
          else mantenimientos += e.cantidad
        })
        
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
      
      if (isOnline) {
        for (const row of toInsert) {
          const { fotos, ...dbPayload } = row
          const res = await api.post('/estaciones-usadas', dbPayload, { token })
          const createdEstacion = res.data
          
          if (fotos && fotos.length > 0) {
            await Promise.all(fotos.map(async (foto) => {
              if (!foto.id || foto.id.startsWith('temp_')) {
                const fotoPayload = {
                  estacion_usada_id: createdEstacion.id,
                  url: foto.url,
                  storage_path: foto.storage_path,
                  descripcion: foto.descripcion || ''
                }
                await api.post('/fotos-estaciones', fotoPayload, { token })
              }
            }))
          }
        }
        
        const data = await api.get('/estaciones-usadas', { params: { orden_id: ordenId }, token })
        setEstaciones(data.data || [])
      } else {
        
        for (const row of toInsert) {
          const { fotos, ...dbPayload } = row
          await db.sync_queue.add({ table: 'estaciones_usadas', operation: 'insert', payload: dbPayload, ordenId, attempts: 0, createdAt: Date.now() + 1 })
          
          if (fotos && fotos.length > 0) {
            for (const f of fotos) {
              await db.sync_queue.add({
                table: 'fotos_estaciones_usadas',
                operation: 'insert',
                payload: {
                  id: f.id || generateUUID(),
                  estacion_usada_id: row.id,
                  url: f.url,
                  storage_path: f.storage_path,
                  descripcion: f.descripcion || ''
                },
                ordenId,
                attempts: 0,
                createdAt: Date.now() + 2
              })
            }
          }
        }
        setEstaciones(toInsert)
      }
      setIsEditingEstaciones(false)
      toast.success('Monitoreo de estaciones actualizado')
    } catch (err) {
      toast.error('Error al guardar estaciones: ' + err.message)
    } finally {
      setSavingEstaciones(false)
    }
  }

  async function handleAddEstacionFoto(idx, file) {
    if (!file) return
    const type = estacionesEdit[idx].tipo_estacion
    const path = `estaciones/orden_${ordenId}_${type}_${Date.now()}.jpg`
    try {
      const { publicUrl, error } = await queuePhoto('fotos-servicio', path, file, file.type || 'image/jpeg')
      if (error) throw error
      
      const newFoto = {
        id: 'temp_' + generateUUID(),
        url: publicUrl,
        storage_path: path,
        descripcion: ''
      }
      
      setEstacionesEdit(prev => prev.map((item, i) => i === idx ? { ...item, fotos: [...item.fotos, newFoto] } : item))
      toast.success('Foto agregada')
    } catch (err) {
      toast.error('Error con foto: ' + err.message)
    }
  }

  async function handleDeleteEstacionFoto(estacionIdx, foto) {
    const token = localStorage.getItem('token')
    try {
      if (foto.id && !foto.id.startsWith('temp_') && isOnline) {
        await api.delete(`/fotos-estaciones/${foto.id}`, { token })
      }
      
      setEstacionesEdit(prev => prev.map((item, i) => {
        if (i === estacionIdx) {
          return { ...item, fotos: item.fotos.filter(f => f.id !== foto.id) }
        }
        return item
      }))
      
      toast.success('Foto eliminada')
    } catch (err) {
      toast.error('Error al eliminar foto')
    }
  }

  const canEdit = isAssignedTecnico && ordenEstado === 'en_progreso'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-600" /> Monitoreo de Estaciones
        </h2>
        {canEdit && !isEditingEstaciones && (
          <button
            onClick={() => { setEstacionesEdit(buildInitialEdit(estaciones)); setIsEditingEstaciones(true) }}
            className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 transition-colors"
          >
            Registrar Mantenimiento
          </button>
        )}
      </div>

      <div className="space-y-4">
        {isEditingEstaciones ? (
          <>
            <div className="space-y-4">
              {estacionesEdit.map((e, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border transition-all ${e.active ? 'bg-primary-50/30 border-primary-200' : 'bg-dark-50/50 border-dark-100 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={e.active}
                        onChange={() => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? { ...item, active: !item.active } : item))}
                        className="w-5 h-5 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="font-bold text-dark-900">{e.tipo_estacion}</span>
                    </label>
                    {e.active && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-dark-400 uppercase">Cantidad:</span>
                        <input
                          type="number"
                          value={e.cantidad}
                          onChange={(ev) => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? { ...item, cantidad: ev.target.value } : item))}
                          className="w-20 input-field py-1 text-center"
                        />
                      </div>
                    )}
                  </div>
                  {e.active && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-dark-200 text-xs font-bold text-dark-700">
                          <input
                            type="checkbox"
                            checked={e.es_nueva_instalacion}
                            onChange={(ev) => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? { ...item, es_nueva_instalacion: ev.target.checked } : item))}
                            className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                          />
                          Nueva Instalación
                        </label>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {e.tipo_estacion === 'Cebadero' ? (
                          <>
                            {['Limpieza', 'Reposición Cebo', 'Cebo Dañado'].map(btn => (
                              <button
                                key={btn}
                                type="button"
                                onClick={() => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? { ...item, observaciones: (item.observaciones ? item.observaciones + ', ' : '') + btn } : item))}
                                className="text-[10px] font-bold uppercase py-1 px-2 rounded-md bg-white border border-primary-200 text-primary-700 hover:bg-primary-100 transition-colors"
                              >
                                + {btn}
                              </button>
                            ))}
                          </>
                        ) : (
                          <>
                            {['Sin Captura', 'Captura', 'Mantenimiento'].map(btn => (
                              <button
                                key={btn}
                                type="button"
                                onClick={() => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? { ...item, observaciones: (item.observaciones ? item.observaciones + ', ' : '') + btn } : item))}
                                className="text-[10px] font-bold uppercase py-1 px-2 rounded-md bg-white border border-primary-200 text-primary-700 hover:bg-primary-100 transition-colors"
                              >
                                + {btn}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                      
                      <textarea
                        placeholder="Describa el mantenimiento realizado (ej: Limpieza, cambio de cebo...)"
                        value={e.observaciones || ''}
                        onChange={(ev) => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? { ...item, observaciones: ev.target.value } : item))}
                        className="input-field text-sm bg-white"
                        rows={2}
                      />
                      
                      <div className="mt-3">
                        <p className="text-[10px] font-bold text-dark-400 uppercase mb-2">Evidencias Fotográficas ({e.fotos.length})</p>
                        <div className="grid grid-cols-3 gap-2">
                          {e.fotos.map((foto, fIdx) => (
                            <div key={foto.id || fIdx} className="relative aspect-video rounded-lg border border-dark-200 bg-white overflow-hidden group">
                              <img src={getAuthImageUrl(foto.url)} className="w-full h-full object-cover" alt="Evidencia" />
                              <button
                                type="button"
                                onClick={() => handleDeleteEstacionFoto(idx, foto)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-90 hover:opacity-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <label className="aspect-video rounded-lg border-2 border-dashed border-dark-200 bg-white hover:border-primary-500 hover:bg-primary-50/20 flex flex-col items-center justify-center cursor-pointer transition-all">
                            <Camera className="w-5 h-5 text-dark-400 mb-0.5" />
                            <span className="text-[9px] font-bold text-dark-500 uppercase">Añadir</span>
                            <input type="file" accept="image/*" onChange={(ev) => handleAddEstacionFoto(idx, ev.target.files[0])} className="hidden" />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4 pt-2">
              <button onClick={handleSaveEstaciones} disabled={savingEstaciones} className="btn-primary flex-1 text-sm py-2">
                {savingEstaciones ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Monitoreo'}
              </button>
              <button onClick={() => setIsEditingEstaciones(false)} className="btn-secondary text-sm py-2">Cancelar</button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {estaciones.length === 0 ? (
              <div className="text-center py-6 bg-dark-50 rounded-xl border border-dashed border-dark-200">
                <p className="text-xs text-dark-400">No se han registrado estaciones aún</p>
              </div>
            ) : (
              estaciones.map((e, i) => (
                <div key={i} className="bg-dark-50 p-3 rounded-xl border border-dark-100">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-dark-900">{e.tipo_estacion}</span>
                      {e.es_nueva_instalacion && (
                        <span className="text-[9px] font-bold bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Nueva Instalación
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-dark-800 bg-white px-3 py-0.5 rounded-lg border border-dark-200">Cant: {e.cantidad}</span>
                  </div>
                  {e.observaciones && (
                    <p className="text-xs text-dark-600 mt-2 bg-white/50 p-2 rounded-lg border border-dark-100 italic">{e.observaciones}</p>
                  )}
                  {e.fotos && e.fotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {e.fotos.map((foto, fIdx) => (
                        <div key={foto.id || fIdx} className="space-y-1">
                          <img src={getAuthImageUrl(foto.url)} className="rounded-lg w-full aspect-video object-cover border border-dark-100" alt={`Foto ${fIdx + 1}`} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
