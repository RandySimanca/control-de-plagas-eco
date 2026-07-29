import { useState } from 'react'
import { History, MessageSquare, Plus, Edit, Trash2, X, Loader2, Search, Image as ImageIcon } from 'lucide-react'
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

export default function OrdenBitacoraModal({
  isOpen,
  onClose,
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
  queuePhoto
}) {
  const [showWizard, setShowWizard] = useState(false)
  const [savingActivity, setSavingActivity] = useState(false)

  const [editingActivity, setEditingActivity] = useState(null)
  const [showEditActivityModal, setShowEditActivityModal] = useState(false)
  const [savingEditActivity, setSavingEditActivity] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null)

  if (!isOpen) return null

  const canEdit = (isAssignedTecnico || isAdmin) && ordenEstado === 'en_progreso'

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
      if (!queued) await successAlert('¡Eliminada!', 'Nota eliminada')
      else toast.success('Eliminación guardada offline ⚡')
    } catch (err) {
      toast.error('Error al eliminar nota: ' + err.message)
    }
  }

  const filteredActividades = actividades.filter(act => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return act.descripcion?.toLowerCase().includes(term)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-3xl h-[92vh] sm:h-[85vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-dark-100">
        
        {/* Header del Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Bitácora de Servicio</h2>
              <p className="text-xs text-blue-100 font-medium">
                {actividades.length} {actividades.length === 1 ? 'avance registrado' : 'avances registrados'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Controles */}
        <div className="p-4 bg-dark-50 border-b border-dark-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar avance..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
            />
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              className="w-full sm:w-auto btn-primary py-2 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-primary-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> Registrar Avance
            </button>
          )}
        </div>

        {/* Cuerpo / Lista de Avances */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {filteredActividades.length === 0 ? (
            <div className="text-center py-16 bg-dark-50/50 rounded-2xl border-2 border-dashed border-dark-200 my-4">
              <MessageSquare className="w-12 h-12 text-dark-300 mx-auto mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-dark-700">Sin registros en la bitácora</h3>
              <p className="text-xs text-dark-400 max-w-xs mx-auto mt-1">
                {searchTerm ? 'No se encontraron avances con esa búsqueda.' : 'Aún no se han registrado notas o fotos para esta orden.'}
              </p>
              {canEdit && !searchTerm && (
                <button
                  type="button"
                  onClick={() => setShowWizard(true)}
                  className="btn-primary text-sm mt-5 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Registrar primer avance
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-0.5 before:bg-indigo-100">
              {filteredActividades.map((act) => {
                const parsed = parseDescripcion(act.descripcion)
                const actFotos = getFotosForActividad(fotos, act.id)
                const textoMostrar = parsed.detalle || act.descripcion

                return (
                  <div key={act.id} className="relative pl-11 group">
                    {/* Indicador de punto en la línea de tiempo */}
                    <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-white border-2 border-indigo-500 shadow-md flex items-center justify-center z-10 group-hover:scale-110 transition-transform">
                      <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-inner" />
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-dark-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {parsed.tipoControl && (
                            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200/60 uppercase tracking-wider">
                              {parsed.tipoControl}
                            </span>
                          )}
                          {parsed.tipo ? (
                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${getTipoBadgeClass(parsed.tipo)}`}>
                              {parsed.tipo}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold bg-blue-50 text-blue-600 uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-blue-200/60">
                              Avance
                            </span>
                          )}
                          {parsed.area && (
                            <span className="text-[11px] text-dark-600 bg-dark-100 px-2.5 py-0.5 rounded-full font-medium">
                              {parsed.area}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <span className="text-xs text-dark-400 font-medium">
                            {new Date(act.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                            {' · '}
                            {new Date(act.created_at).toLocaleDateString('es')}
                          </span>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => { setEditingActivity({ ...act }); setShowEditActivityModal(true) }}
                                className="p-1.5 text-dark-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Editar avance"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteActivity(act.id)}
                                className="p-1.5 text-dark-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar avance"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-dark-800 leading-relaxed font-normal whitespace-pre-line">
                        {textoMostrar}
                      </p>

                      {/* Fotos asociadas al avance */}
                      {actFotos.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-dark-100">
                          <p className="text-xs font-semibold text-dark-500 mb-2 flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-indigo-500" /> Evidencias ({actFotos.length}):
                          </p>
                          <div className="flex flex-wrap gap-2.5">
                            {actFotos.map(foto => (
                              <button
                                type="button"
                                key={foto.id || foto.storage_path}
                                onClick={() => setPreviewPhotoUrl(getAuthImageUrl(foto.url))}
                                className="relative group/img w-20 h-20 rounded-xl overflow-hidden border border-dark-200 shadow-xs hover:shadow-md hover:ring-2 hover:ring-indigo-500 transition-all focus:outline-none"
                              >
                                <img
                                  src={getAuthImageUrl(foto.url)}
                                  alt={foto.descripcion || 'Evidencia'}
                                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="p-4 bg-dark-50 border-t border-dark-100 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-2 px-5 text-sm font-semibold rounded-xl"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal Wizard para crear avances */}
      <ActividadWizardModal
        isOpen={showWizard}
        onClose={() => !savingActivity && setShowWizard(false)}
        onSave={handleSaveActivity}
        saving={savingActivity}
        ordenTipoPlaga={ordenTipoPlaga}
      />

      {/* Modal: Ver Foto Grande */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute -top-12 right-0 text-white bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewPhotoUrl}
              alt="Vista previa foto"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Modal: Editar Avance */}
      {showEditActivityModal && editingActivity && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border border-dark-100">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between bg-dark-50">
              <h3 className="font-bold text-dark-900">Editar Avance</h3>
              <button
                type="button"
                onClick={() => setShowEditActivityModal(false)}
                className="p-2 hover:bg-dark-200/50 rounded-lg text-dark-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateActivity} className="p-6 space-y-4">
              <div>
                <label className="label-field">Descripción del Avance</label>
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
    </div>
  )
}
