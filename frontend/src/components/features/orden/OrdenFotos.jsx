import { useState } from 'react'
import { Camera, Upload, Loader2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import { confirmDelete, successAlert } from '../../../lib/alerts'
import { getAuthImageUrl } from '../../../utils/imageUtils'
import { generateUUID } from '../../../utils/uuid'

export default function OrdenFotos({
  ordenId,
  fotos,
  setFotos,
  isAssignedTecnico,
  ordenEstado,
  queuePhoto
}) {
  const [uploadingFotos, setUploadingFotos] = useState(false)

  const canEdit = isAssignedTecnico && ordenEstado === 'en_progreso'

  async function handleUploadFotosQuick(e) {
    if (!e.target.files || e.target.files.length === 0) return
    const files = Array.from(e.target.files)
    setUploadingFotos(true)
    toast.loading('Procesando fotos...', { id: 'evt-upload' })
    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const path = `evidencias/evt_${ordenId}_${Date.now()}_${safeName}`
        const dbPayload = { 
          id: generateUUID(), 
          orden_id: ordenId, 
          storage_path: path, 
          descripcion: 'Evidencia general subida por técnico' 
        }
        const { publicUrl } = await queuePhoto('fotos-servicio', path, file, file.type, 'fotos_servicio', dbPayload, ordenId)
        setFotos(prev => [...prev, { ...dbPayload, url: publicUrl }])
      }
      toast.success('Fotos guardadas')
    } catch (err) {
      toast.error('Error con fotos: ' + err.message)
    } finally {
      setUploadingFotos(false)
      toast.dismiss('evt-upload')
      if (e.target) e.target.value = null
    }
  }

  async function handleDeletePhoto(foto) {
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar esta fotografía?', 'No se podrá recuperar la imagen.')
    if (!isConfirmed) return
    try {
      await api.delete(`/fotos-servicio/${foto.id}`)
      setFotos(prev => prev.filter(f => f.id !== foto.id))
      await successAlert('¡Eliminada!', 'Fotografía eliminada')
    } catch (err) {
      toast.error('Error al eliminar foto: ' + err.message)
    }
  }

  return (
    <div className="card mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary-600" /> Galería Evidencias ({fotos.length})
        </h2>
        {canEdit && (
          <div className="relative group overflow-hidden">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleUploadFotosQuick} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <button className="btn-primary text-sm py-1.5 px-4 w-full sm:w-auto relative group-hover:bg-primary-700">
              {uploadingFotos ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto"/>
              ) : (
                <><Upload className="w-4 h-4 mr-2 inline" /> Subir Evidencia</>
              )}
            </button>
          </div>
        )}
      </div>
      
      {fotos.length === 0 ? (
        <div className="text-center py-6 bg-dark-50 rounded-xl border border-dashed border-dark-200">
          <Camera className="w-8 h-8 text-dark-300 mx-auto mb-2" />
          <p className="text-sm text-dark-400">No hay fotografías adjuntas</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {fotos.map(f => (
            <div key={f.id} className="relative group aspect-square rounded-xl overflow-hidden bg-dark-100 border border-dark-200">
              <a href={getAuthImageUrl(f.url)} target="_blank" rel="noopener noreferrer">
                <img 
                  src={getAuthImageUrl(f.url)} 
                  alt="Foto servicio" 
                  className="w-full h-full object-cover hover:scale-105 transition-transform" 
                />
              </a>
              {canEdit && (
                <button 
                  onClick={() => handleDeletePhoto(f)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600"
                  title="Eliminar Foto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
