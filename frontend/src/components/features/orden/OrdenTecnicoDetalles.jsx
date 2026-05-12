import { useState } from 'react'
import { MapPin, Package, FileText, PenLine, Plus, X, Loader2, Camera, Upload, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateUUID } from '../../../utils/uuid'

const OPCIONES_AREAS = [
  "Áreas Administrativas y Oficinas", "Baños y Vestieres", "Bodegas y Almacenamiento",
  "Cocina y Preparación de Alimentos", "Cuartos de Archivo y Cómputo", "Cámaras de Frío y Neveras",
  "Ductos y Aire Acondicionado", "Fachada y Perímetro Exterior", "Garajes, Parqueaderos y Sótanos",
  "Habitaciones y Alcobas", "Jardines y Zonas Verdes", "Líneas de Producción",
  "Sala y Comedor", "Silos y Tolvas", "Techo y Cielo Raso", "Zona de Basuras y Shut",
  "Zonas de Carga y Despachos", "Zonas de Lavado y Lavandería"
]

const METODOS_DESINSECTACION = ["Pulverización líquida", "Nebulización en frío (ULV)", "Termonebulización", "Aplicación de gel", "Polvo insecticida", "Cebos", "Trampas de luz UV", "Trampas de feromonas"]
const METODOS_DESRATIZACION = ["Rodenticidas en cebo", "Trampas mecánicas", "Trampas de pegamento", "Fumigación con fosfuro de aluminio"]
const METODOS_DESINFECCION = ["Pulverización química", "Nebulización", "Ozono", "Luz UV-C", "Vapor"]

export default function OrdenTecnicoDetalles({
  orden,
  setOrden,
  setFotos,
  isAssignedTecnico,
  queueOrExecute,
  queuePhoto
}) {
  const [showAreasModal, setShowAreasModal] = useState(false)
  const [selectedAreas, setSelectedAreas] = useState([])
  const [savingAreas, setSavingAreas] = useState(false)

  const [showMetodosModal, setShowMetodosModal] = useState(false)
  const [selectedMetodos, setSelectedMetodos] = useState([])
  const [savingMetodos, setSavingMetodos] = useState(false)

  const [showRecomendacionesModal, setShowRecomendacionesModal] = useState(false)
  const [recomendacionesText, setRecomendacionesText] = useState(orden.recomendaciones || '')
  const [recommendationPhotos, setRecommendationPhotos] = useState([])
  const [savingRecomendaciones, setSavingRecomendaciones] = useState(false)

  const canEdit = isAssignedTecnico && orden.estado === 'en_progreso'

  async function handleSaveAreas() {
    setSavingAreas(true)
    try {
      const areaStr = selectedAreas.join(', ')
      const { queued } = await queueOrExecute('ordenes_servicio', 'update', { id: orden.id, areas_intervenidas: areaStr }, orden.id)
      setOrden(prev => ({ ...prev, areas_intervenidas: areaStr }))
      setShowAreasModal(false)
      toast.success(queued ? 'Áreas guardadas offline ⚡' : 'Áreas intervenidas actualizadas')
    } catch (err) {
      toast.error('Error al guardar áreas: ' + err.message)
    } finally {
      setSavingAreas(false)
    }
  }

  async function handleSaveMetodos() {
    setSavingMetodos(true)
    try {
      const metStr = selectedMetodos.join(', ')
      const { queued } = await queueOrExecute('ordenes_servicio', 'update', { id: orden.id, metodos_aplicados: metStr }, orden.id)
      setOrden(prev => ({ ...prev, metodos_aplicados: metStr }))
      setShowMetodosModal(false)
      toast.success(queued ? 'Métodos guardados offline ⚡' : 'Métodos de aplicación actualizados')
    } catch (err) {
      toast.error('Error al guardar métodos: ' + err.message)
    } finally {
      setSavingMetodos(false)
    }
  }

  async function handleSaveRecomendaciones(e) {
    if (e) e.preventDefault()
    setSavingRecomendaciones(true)
    try {
      const { queued } = await queueOrExecute('ordenes_servicio', 'update', { id: orden.id, recomendaciones: recomendacionesText }, orden.id)

      if (recommendationPhotos.length > 0) {
        for (const file of recommendationPhotos) {
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const path = `recomendaciones/rec_${orden.id}_${Date.now()}_${safeName}`
          const dbPayload = { id: generateUUID(), orden_id: orden.id, storage_path: path, descripcion: 'Evidencia de recomendación técnica' }
          const { publicUrl } = await queuePhoto('fotos-servicio', path, file, file.type, 'fotos_servicio', dbPayload, orden.id)
          if (!queued) setFotos(prev => [...prev, { ...dbPayload, url: publicUrl }])
        }
      }

      setOrden(prev => ({ ...prev, recomendaciones: recomendacionesText }))
      setShowRecomendacionesModal(false)
      setRecommendationPhotos([])
      toast.success(queued ? 'Guardado offline ⚡' : 'Recomendaciones guardadas exitosamente')
    } catch(err) {
      toast.error('Error guardando recomendaciones')
    } finally {
      setSavingRecomendaciones(false)
    }
  }

  return (
    <>
      {/* Areas */}
      <div className="card mt-6 border-t-4 border-t-indigo-500">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" /> Áreas Intervenidas
          </h2>
          {canEdit && (
            <button onClick={() => {
              setSelectedAreas(orden.areas_intervenidas ? orden.areas_intervenidas.split(', ') : [])
              setShowAreasModal(true)
            }} className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Especificar Áreas
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
           {orden.areas_intervenidas ? orden.areas_intervenidas.split(', ').map((a,idx) => <span key={idx} className="bg-dark-50 border border-dark-200 text-dark-800 px-3 py-1 rounded-full text-sm font-medium">{a}</span>) : <span className="text-sm text-dark-400">No se han especificado áreas</span>}
        </div>
      </div>

      {/* Métodos */}
      <div className="card mt-6 border-t-4 border-t-indigo-400 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" /> Métodos de Aplicación
          </h2>
          {canEdit && (
            <button onClick={() => {
              setSelectedMetodos(orden.metodos_aplicados ? orden.metodos_aplicados.split(', ') : [])
              setShowMetodosModal(true)
            }} className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Seleccionar Métodos
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
           {orden.metodos_aplicados ? orden.metodos_aplicados.split(', ').map((m,idx) => <span key={idx} className="bg-dark-50 border border-dark-200 text-dark-800 px-3 py-1 rounded-full text-sm font-medium">{m}</span>) : <span className="text-sm text-dark-400">No se han especificado métodos...</span>}
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="card border-t-4 border-t-primary-500 mt-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" /> Recomendaciones del Técnico
          </h2>
          {canEdit && (
            <button onClick={() => setShowRecomendacionesModal(true)} className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-2">
              <PenLine className="w-4 h-4" /> {orden.recomendaciones ? 'Editar Recomendaciones' : 'Escribir Recomendaciones'}
            </button>
          )}
        </div>
        <p className="text-dark-700 whitespace-pre-wrap text-sm leading-relaxed bg-dark-50 p-4 rounded-xl border border-dark-100">
          {orden.recomendaciones || 'El técnico aún no ha reportado recomendaciones para este servicio.'}
        </p>
      </div>

      {/* Modales */}
      {showAreasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between">
              <h3 className="font-bold text-dark-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-indigo-600" /> Seleccionar Áreas Intervenidas</h3>
              <button onClick={() => setShowAreasModal(false)} className="p-2 hover:bg-dark-50 rounded-lg text-dark-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                 {OPCIONES_AREAS.map(area => (
                    <label key={area} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedAreas.includes(area) ? 'bg-indigo-50/50 border-indigo-300' : 'bg-dark-50 border-dark-100 hover:border-dark-300'}`}>
                      <input type="checkbox" checked={selectedAreas.includes(area)} onChange={(e) => {
                        if (e.target.checked) setSelectedAreas([...selectedAreas, area]);
                        else setSelectedAreas(selectedAreas.filter(a => a !== area));
                      }} className="w-4 h-4 rounded border-dark-300 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-dark-800 leading-tight">{area}</span>
                    </label>
                 ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-dark-100 flex justify-end gap-3 bg-dark-50/50">
              <button onClick={() => setShowAreasModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSaveAreas} disabled={savingAreas} className="btn-primary">
                {savingAreas ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar Áreas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMetodosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-dark-900">Métodos Aplicados</h3>
                <p className="text-xs text-dark-500 mt-0.5">Selecciona las técnicas específicas utilizadas en el servicio</p>
              </div>
              <button onClick={() => setShowMetodosModal(false)} className="p-2 hover:bg-dark-50 rounded-lg text-dark-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(() => {
                  let arr = METODOS_DESINSECTACION;
                  const t = (orden.tipo_plaga || '').toLowerCase();
                  if (t.includes('rat') || t.includes('roe')) arr = METODOS_DESRATIZACION;
                  if (t.includes('infec') || t.includes('sani') || t.includes('micro')) arr = METODOS_DESINFECCION;
                  return [...arr, "Otro método"].map(met => (
                    <label key={met} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedMetodos.includes(met) ? 'bg-primary-50 border-primary-200' : 'bg-white border-dark-200 hover:border-primary-300'}`}>
                      <input type="checkbox" checked={selectedMetodos.includes(met)} onChange={(e) => {
                        if (e.target.checked) setSelectedMetodos([...selectedMetodos, met]);
                        else setSelectedMetodos(selectedMetodos.filter(a => a !== met));
                      }} className="mt-0.5 w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500" />
                      <span className="text-sm font-medium text-dark-700 leading-snug">{met}</span>
                    </label>
                  ));
                })()}
              </div>
            </div>
            <div className="p-6 border-t border-dark-100 flex justify-end gap-3 shrink-0 bg-dark-50">
              <button onClick={() => setShowMetodosModal(false)} className="btn-secondary">Cancelar</button>
              <button disabled={savingMetodos} onClick={handleSaveMetodos} className="btn-primary min-w-[120px]">
                {savingMetodos ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecomendacionesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between bg-primary-50/50">
              <h3 className="font-bold text-dark-900 flex items-center gap-2"><FileText className="w-5 h-5 text-primary-600" /> Recomendaciones Técnicas</h3>
              <button onClick={() => setShowRecomendacionesModal(false)} className="p-2 hover:bg-dark-100 rounded-lg text-dark-400 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveRecomendaciones} className="p-6 space-y-5">
              <div>
                <label className="label-field">¿Qué recomendaciones dejas para el establecimiento?</label>
                <textarea 
                  className="input-field min-h-[180px] resize-none text-sm" 
                  value={recomendacionesText} 
                  onChange={e => setRecomendacionesText(e.target.value)}
                  placeholder="Ej: Sellar el ingreso de tuberías bajo el lavaplatos..."
                  required
                />
              </div>
              <div>
                <label className="label-field">Adjuntar Evidencias Fotográficas</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-primary-100 border-dashed rounded-xl hover:border-primary-400 hover:bg-primary-50/30 transition-all cursor-pointer relative">
                  <input type="file" multiple accept="image/*" onChange={(e) => { if (e.target.files) setRecommendationPhotos(Array.from(e.target.files)) }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="space-y-2 text-center">
                    <Camera className="mx-auto h-10 w-10 text-primary-300" />
                    <div className="flex text-sm text-dark-600"><span className="font-medium text-primary-600">Sube fotos de evidencia</span></div>
                  </div>
                </div>
                {recommendationPhotos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recommendationPhotos.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full text-xs font-medium border border-primary-100"><Camera className="w-3 h-3" /> {f.name.substring(0, 15)}...</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingRecomendaciones} className="btn-primary flex-1 shadow-lg shadow-primary-200">
                  {savingRecomendaciones ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-2"><Save className="w-5 h-5" /> Guardar y Reportar</span>}
                </button>
                <button type="button" onClick={() => setShowRecomendacionesModal(false)} className="btn-secondary">Cerrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
