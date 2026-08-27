import { forwardRef, useImperativeHandle, useState } from 'react'
import { History, MessageSquare, Plus, Edit, Trash2, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateUUID } from '../../../utils/uuid'
import { confirmDelete, successAlert } from '../../../lib/alerts'
import { getAuthImageUrl } from '../../../utils/imageUtils'
import {
  parseDescripcion,
  getFotosForActividad,
  getTipoBadgeClass
} from '../../../utils/actividadTemplates'
import ActividadWizardModal from './ActividadWizardModal'

const OrdenActividades = forwardRef(function OrdenActividades({
  ordenId,
  actividades,
  setActividades,
  fotos = [],
  setFotos,
  isAssignedTecnico,
  isAdmin,
  ordenEstado,
  ordenTipoPlaga,
  queueOrExecute,
  queuePhoto,
  servicioFiltro
}, ref) {
  const [showWizard, setShowWizard] = useState(false)
  const [savingActivity, setSavingActivity] = useState(false)

  const [editingActivity, setEditingActivity] = useState(null)
  const [showEditActivityModal, setShowEditActivityModal] = useState(false)
  const [savingEditActivity, setSavingEditActivity] = useState(false)

  const canEdit = isAdmin || (isAssignedTecnico && ordenEstado === 'en_progreso')

  useImperativeHandle(ref, () => ({
    openWizard: () => {
      if (canEdit) setShowWizard(true)
    }
  }), [canEdit])

  async function handleSaveActivity({ descripcion, photos }) {
    setSavingActivity(true)
    try {
      const actividadId = generateUUID()
      const actPayload = {
        id: actividadId,
        orden_id: ordenId,
        descripcion,
        created_at: new Date().toISOString()
      }

      const { data: actRows, queued } = await queueOrExecute(
        'actividades_servicio',
        'insert',
        actPayload,
        ordenId
      )
      const actData = actRows?.[0] || actPayload

      if (photos.length > 0) {
        for (const file of photos) {
          const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'photo.jpg'
          const path = `actividades/${actividadId}/${Date.now()}_${safeName}`
          const dbPayload = {
            id: generateUUID(),
            orden_id: ordenId,
            storage_path: path,
            descripcion: descripcion.substring(0, 80)
          }
          const { publicUrl, error: photoErr, queued: photoQueued } = await queuePhoto(
            'fotos-servicio',
            path,
            file,
            file.type || 'image/jpeg',
            'fotos_servicio',
            dbPayload,
            ordenId
          )
          if (photoErr) {
            console.error('Error subiendo foto de actividad:', photoErr)
            toast.error('Error con foto: ' + photoErr.message)
          } else if (!photoQueued && publicUrl) {
            setFotos(prev => [...prev, { ...dbPayload, url: publicUrl }])
          } else if (photoQueued) {
            setFotos(prev => [...prev, { ...dbPayload, url: publicUrl || dbPayload.storage_path, _queued: true }])
          }
        }
      }

      setActividades(prev => [actData, ...prev])
      setShowWizard(false)
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
      const { queued } = await queueOrExecute(
        'actividades_servicio',
        'update',
        { id: editingActivity.id, descripcion: editingActivity.descripcion },
        ordenId
      )
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
      setFotos(fotos.filter(f => !f.storage_path || !f.storage_path.includes(`actividades/${actId}/`)))
      
      if (!queued) await successAlert('¡Eliminada!', 'Nota eliminada')
      else toast.success('Eliminación guardada offline ⚡')

    } catch (err) {
      toast.error('Error al eliminar nota: ' + err.message)
    }
  }

  return (
    <>
      <div className="card mt-6" id="bitacora-actividades">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <History className="w-5 h-5 text-primary-600" /> Bitácora de Actividad
          </h2>
          {canEdit && (
            <button
              onClick={() => setShowWizard(true)}
              className="btn-secondary text-sm py-1.5 inline-flex"
            >
              <Plus className="w-4 h-4" /> Registrar Avance
            </button>
          )}
        </div>

        {actividades.length === 0 ? (
          <div className="text-center py-8 bg-dark-50 rounded-xl border border-dashed border-dark-200">
            <MessageSquare className="w-8 h-8 text-dark-300 mx-auto mb-2" />
            <p className="text-sm text-dark-400">No hay avances registrados aún</p>
            {canEdit && (
              <button
                onClick={() => setShowWizard(true)}
                className="btn-primary text-sm mt-4 inline-flex"
              >
                <Plus className="w-4 h-4" /> Registrar primer avance
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-dark-100">
            {actividades.map((act) => {
              const parsed = parseDescripcion(act.descripcion)
              const actFotos = getFotosForActividad(fotos, act.id)
              const textoMostrar = parsed.detalle || act.descripcion

              return (
                <div key={act.id} className="relative pl-10">
                  <div className="absolute left-0 top-1 w-9 h-9 rounded-full bg-white border-2 border-primary-500 flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-primary-600" />
                  </div>
                  <div className="bg-dark-50 p-4 rounded-xl border border-dark-100">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {parsed.tipoControl && (
                          <span className="text-xs font-bold bg-dark-200 text-dark-800 uppercase tracking-wider px-2 py-0.5 rounded-full border border-dark-300">
                            {parsed.tipoControl}
                          </span>
                        )}
                        {parsed.tipo ? (
                          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getTipoBadgeClass(parsed.tipo)}`}>
                            {parsed.tipo}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">Avance</span>
                        )}
                        {parsed.area && (
                          <span className="text-xs text-dark-500 bg-white px-2 py-0.5 rounded-full border border-dark-100">
                            {parsed.area}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-dark-400 whitespace-nowrap">
                          {new Date(act.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          {new Date(act.created_at).toLocaleDateString('es')}
                        </span>
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditingActivity({ ...act }); setShowEditActivityModal(true) }}
                              className="p-1 text-dark-400 hover:text-primary-600 transition-colors"
                              title="Editar nota"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(act.id)}
                              className="p-1 text-dark-400 hover:text-red-500 transition-colors"
                              title="Eliminar nota"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-dark-700 leading-relaxed">{textoMostrar}</p>

                    {actFotos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {actFotos.map(foto => (
                          <a
                            key={foto.id || foto.storage_path}
                            href={getAuthImageUrl(foto.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-16 h-16 rounded-lg overflow-hidden border border-dark-200 hover:ring-2 hover:ring-primary-400 transition-all"
                          >
                            <img
                              src={getAuthImageUrl(foto.url)}
                              alt={foto.descripcion || 'Evidencia'}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ActividadWizardModal
        isOpen={showWizard}
        onClose={() => !savingActivity && setShowWizard(false)}
        onSave={handleSaveActivity}
        saving={savingActivity}
        ordenTipoPlaga={ordenTipoPlaga}
        defaultTipoControl={servicioFiltro}
      />

      {/* Modal: Editar avance (texto completo, compatible con entradas antiguas) */}
      {showEditActivityModal && editingActivity && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between">
              <h3 className="font-bold text-dark-900">Editar Avance</h3>
              <button
                onClick={() => setShowEditActivityModal(false)}
                className="p-2 hover:bg-dark-50 rounded-lg text-dark-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateActivity} className="p-6 space-y-4">
              <div>
                <label className="label-field">Descripción</label>
                <textarea
                  className="input-field min-h-[120px] resize-none"
                  value={editingActivity.descripcion}
                  onChange={e => setEditingActivity({ ...editingActivity, descripcion: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingEditActivity} className="btn-primary flex-1">
                  {savingEditActivity ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Actualizar'}
                </button>
                <button type="button" onClick={() => setShowEditActivityModal(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
})

export default OrdenActividades
