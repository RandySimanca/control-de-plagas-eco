import { useState } from 'react'
import { History, MessageSquare, Plus, Edit, Trash2, Upload, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateUUID } from '../../../utils/uuid'
import { confirmDelete, successAlert } from '../../../lib/alerts'

export default function OrdenActividades({
  ordenId,
  actividades,
  setActividades,
  setFotos,
  isAssignedTecnico,
  ordenEstado,
  queueOrExecute,
  queuePhoto
}) {
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [newActivity, setNewActivity] = useState('')
  const [activityPhotos, setActivityPhotos] = useState([])
  const [savingActivity, setSavingActivity] = useState(false)

  const [editingActivity, setEditingActivity] = useState(null)
  const [showEditActivityModal, setShowEditActivityModal] = useState(false)
  const [savingEditActivity, setSavingEditActivity] = useState(false)

  const canEdit = isAssignedTecnico && ordenEstado === 'en_progreso'

  async function handleSaveActivity(e) {
    e.preventDefault()
    if (!newActivity.trim()) return
    setSavingActivity(true)
    try {
      const actPayload = { id: generateUUID(), orden_id: ordenId, descripcion: newActivity, created_at: new Date().toISOString() }
      const { data: actRows, queued } = await queueOrExecute('actividades_servicio', 'insert', actPayload, ordenId)
      const actData = actRows?.[0] || actPayload

      if (activityPhotos.length > 0) {
        for (const file of activityPhotos) {
          const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'photo.jpg'
          const path = `actividades/act_${ordenId}_${Date.now()}_${safeName}`
          const dbPayload = { id: generateUUID(), orden_id: ordenId, storage_path: path, descripcion: newActivity.substring(0, 50) }
          const { publicUrl, error: photoErr } = await queuePhoto('fotos-servicio', path, file, file.type || 'image/jpeg', 'fotos_servicio', dbPayload, ordenId)
          if (photoErr) {
            console.error('Error subiendo foto de actividad:', photoErr)
            toast.error('Error con foto: ' + photoErr.message)
          } else if (!queued && publicUrl) {
            setFotos(prev => [...prev, { ...dbPayload, url: publicUrl }])
          }
        }
      }

      setActividades(prev => [actData, ...prev])
      setNewActivity('')
      setActivityPhotos([])
      setShowActivityModal(false)
      toast.success(queued ? 'Actividad guardada offline ⚡' : 'Actividad registrada')
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setSavingActivity(false)
    }
  }

  async function handleUpdateActivity(e) {
    e.preventDefault()
    if (!editingActivity || !editingActivity.descripcion.trim()) return
    setSavingEditActivity(true)
    try {
      const { queued } = await queueOrExecute('actividades_servicio', 'update', { id: editingActivity.id, descripcion: editingActivity.descripcion }, ordenId)
      setActividades(actividades.map(a => a.id === editingActivity.id ? editingActivity : a))
      setShowEditActivityModal(false)
      setEditingActivity(null)
      toast.success(queued ? 'Actualizado offline ⚡' : 'Actividad actualizada')
    } catch (err) {
      toast.error('Error al actualizar: ' + err.message)
    } finally {
      setSavingEditActivity(false)
    }
  }

  async function handleDeleteActivity(actId) {
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar esta nota?', 'Se borrará la entrada de la bitácora.')
    if (!isConfirmed) return
    try {
      const { queued } = await queueOrExecute('actividades_servicio', 'delete', { id: actId }, ordenId)
      setActividades(actividades.filter(a => a.id !== actId))
      if (!queued) await successAlert('¡Eliminada!', 'Nota eliminada')
      else toast.success('Eliminación guardada offline ⚡')
    } catch (err) {
      toast.error('Error al eliminar nota: ' + err.message)
    }
  }

  return (
    <>
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <History className="w-5 h-5 text-primary-600" /> Bitácora de Actividad
          </h2>
          {canEdit && (
            <button onClick={() => setShowActivityModal(true)} className="btn-secondary text-sm py-1.5">
              <Plus className="w-4 h-4" /> Registrar Avance
            </button>
          )}
        </div>

        {actividades.length === 0 ? (
          <div className="text-center py-8 bg-dark-50 rounded-xl border border-dashed border-dark-200">
            <MessageSquare className="w-8 h-8 text-dark-300 mx-auto mb-2" />
            <p className="text-sm text-dark-400">No hay avances registrados aún</p>
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-dark-100">
            {actividades.map((act) => (
              <div key={act.id} className="relative pl-10">
                <div className="absolute left-0 top-1 w-9 h-9 rounded-full bg-white border-2 border-primary-500 flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-primary-600" />
                </div>
                <div className="bg-dark-50 p-4 rounded-xl border border-dark-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">Avance de Servicio</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-dark-400">
                        {new Date(act.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} - {new Date(act.created_at).toLocaleDateString('es')}
                      </span>
                      {canEdit && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setEditingActivity({ ...act }); setShowEditActivityModal(true) }}
                            className="p-1 text-dark-400 hover:text-primary-600 transition-colors"
                            title="Editar Nota"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(act.id)}
                            className="p-1 text-dark-400 hover:text-red-500 transition-colors"
                            title="Eliminar Nota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-dark-700 leading-relaxed">{act.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Nuevo Avance */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between">
              <h3 className="font-bold text-dark-900">Registrar Nuevo Avance</h3>
              <button onClick={() => setShowActivityModal(false)} className="p-2 hover:bg-dark-50 rounded-lg text-dark-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveActivity} className="p-6 space-y-4">
              <div>
                <label className="label-field">Descripción del trabajo realizado</label>
                <textarea
                  className="input-field min-h-[120px] resize-none"
                  value={newActivity}
                  onChange={e => setNewActivity(e.target.value)}
                  placeholder="Ej: Se realizó inspección en cocina, se encontraron focos de humedad..."
                  required
                />
              </div>
              <div>
                <label className="label-field">Fotos del avance (4-6 recomendadas)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dark-200 border-dashed rounded-xl hover:border-primary-400 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => { if (e.target.files) setActivityPhotos(Array.from(e.target.files)) }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-10 w-10 text-dark-400" />
                    <div className="flex text-sm text-dark-600">
                      <span className="font-medium text-primary-600">Sube archivos</span>
                      <p className="pl-1">o arrastra y suelta</p>
                    </div>
                    <p className="text-xs text-dark-400">JPG, PNG hasta 10MB</p>
                  </div>
                </div>
                {activityPhotos.length > 0 && (
                  <p className="text-xs text-primary-600 mt-2 font-medium">{activityPhotos.length} fotos seleccionadas</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingActivity} className="btn-primary flex-1">
                  {savingActivity ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar Avance'}
                </button>
                <button type="button" onClick={() => setShowActivityModal(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Avance */}
      {showEditActivityModal && editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between">
              <h3 className="font-bold text-dark-900">Editar Avance</h3>
              <button onClick={() => setShowEditActivityModal(false)} className="p-2 hover:bg-dark-50 rounded-lg text-dark-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateActivity} className="p-6 space-y-4">
              <div>
                <label className="label-field">Descripción corregida</label>
                <textarea
                  className="input-field min-h-[120px] resize-none"
                  value={editingActivity.descripcion}
                  onChange={e => setEditingActivity({ ...editingActivity, descripcion: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingEditActivity} className="btn-primary flex-1">
                  {savingEditActivity ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Actualizar Nota'}
                </button>
                <button type="button" onClick={() => setShowEditActivityModal(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
