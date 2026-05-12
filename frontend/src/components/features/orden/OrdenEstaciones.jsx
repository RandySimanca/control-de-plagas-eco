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
      foto_antes_url: found ? found.foto_antes_url : null,
      foto_despues_url: found ? found.foto_despues_url : null,
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
    try {
      const toInsert = estacionesEdit.filter(e => e.active).map(e => ({
        id: e.id || generateUUID(),
        orden_id: ordenId,
        tipo_estacion: e.tipo_estacion,
        cantidad: parseInt(e.cantidad) || 0,
        observaciones: e.observaciones || '',
        foto_antes_url: e.foto_antes_url,
        foto_despues_url: e.foto_despues_url
      }))

      await queueOrExecute('estaciones_usadas', 'delete', { id: `orden_${ordenId}` }, ordenId)
      if (isOnline) {
        await api.delete('/estaciones-usadas', { params: { orden_id: ordenId }, token: localStorage.getItem('token') })
        if (toInsert.length > 0) {
          await Promise.all(
            toInsert.map(row => api.post('/estaciones-usadas', row, { token: localStorage.getItem('token') }))
          )
        }
        const data = await api.get('/estaciones-usadas', { params: { orden_id: ordenId }, token: localStorage.getItem('token') })
        setEstaciones(data.data || [])
      } else {
        await db.sync_queue.add({ table: 'estaciones_usadas', operation: 'delete_where', payload: { filter: 'orden_id', value: ordenId }, ordenId, attempts: 0, createdAt: Date.now() })
        for (const row of toInsert) {
          await db.sync_queue.add({ table: 'estaciones_usadas', operation: 'insert', payload: row, ordenId, attempts: 0, createdAt: Date.now() + 1 })
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

  async function handleUploadEstacionFoto(idx, context, file) {
    if (!file) return
    const type = estacionesEdit[idx].tipo_estacion
    const path = `estaciones/orden_${ordenId}_${type}_${context}_${Date.now()}.jpg`
    try {
      const { publicUrl, error } = await queuePhoto('fotos-servicio', path, file, file.type || 'image/jpeg')
      if (error) throw error
      const field = context === 'antes' ? 'foto_antes_url' : 'foto_despues_url'
      setEstacionesEdit(prev => prev.map((item, i) => i === idx ? { ...item, [field]: publicUrl } : item))
      toast.success(`Foto ${context} guardada`)
    } catch (err) {
      toast.error('Error con foto: ' + err.message)
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
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {/* Foto antes */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-dark-400 uppercase">Estado Inicial (Antes)</p>
                          <div className="relative aspect-video rounded-lg border-2 border-dashed border-dark-200 bg-white flex items-center justify-center overflow-hidden">
                            {e.foto_antes_url ? (
                              <>
                                <img src={getAuthImageUrl(e.foto_antes_url)} className="w-full h-full object-cover" alt="Antes" />
                                <button
                                  onClick={() => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? { ...item, foto_antes_url: null } : item))}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center">
                                <Camera className="w-5 h-5 text-dark-300" />
                                <input type="file" accept="image/*" onChange={(ev) => handleUploadEstacionFoto(idx, 'antes', ev.target.files[0])} className="hidden" />
                              </label>
                            )}
                          </div>
                        </div>
                        {/* Foto después */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-dark-400 uppercase">Estado Final (Después)</p>
                          <div className="relative aspect-video rounded-lg border-2 border-dashed border-dark-200 bg-white flex items-center justify-center overflow-hidden">
                            {e.foto_despues_url ? (
                              <>
                                <img src={getAuthImageUrl(e.foto_despues_url)} className="w-full h-full object-cover" alt="Después" />
                                <button
                                  onClick={() => setEstacionesEdit(prev => prev.map((item, i) => i === idx ? { ...item, foto_despues_url: null } : item))}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center">
                                <Camera className="w-5 h-5 text-dark-300" />
                                <input type="file" accept="image/*" onChange={(ev) => handleUploadEstacionFoto(idx, 'despues', ev.target.files[0])} className="hidden" />
                              </label>
                            )}
                          </div>
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
                    <span className="text-sm font-bold text-dark-900">{e.tipo_estacion}</span>
                    <span className="text-sm font-bold text-dark-800 bg-white px-3 py-0.5 rounded-lg border border-dark-200">Cant: {e.cantidad}</span>
                  </div>
                  {e.observaciones && (
                    <p className="text-xs text-dark-600 mt-2 bg-white/50 p-2 rounded-lg border border-dark-100 italic">{e.observaciones}</p>
                  )}
                  {(e.foto_antes_url || e.foto_despues_url) && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {e.foto_antes_url && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-dark-400 uppercase">Antes</p>
                          <img src={getAuthImageUrl(e.foto_antes_url)} className="rounded-lg w-full aspect-video object-cover border border-dark-100" alt="Antes" />
                        </div>
                      )}
                      {e.foto_despues_url && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-dark-400 uppercase">Después</p>
                          <img src={getAuthImageUrl(e.foto_despues_url)} className="rounded-lg w-full aspect-video object-cover border border-dark-100" alt="Después" />
                        </div>
                      )}
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
