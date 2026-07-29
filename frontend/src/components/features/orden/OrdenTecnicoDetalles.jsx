import { useState } from 'react'
import { MapPin, Package, FileText, PenLine, Plus, X, Loader2, Camera, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateUUID } from '../../../utils/uuid'
import { parseTipoPlaga } from '../../../utils/tipoPlaga'

const OPCIONES_AREAS = [
  "Áreas Administrativas y Oficinas", "Baños y Vestieres", "Bodegas y Almacenamiento",
  "Cocina y Preparación de Alimentos", "Cuartos de Archivo y Cómputo", "Cámaras de Frío y Neveras",
  "Ductos y Aire Acondicionado", "Fachada y Perímetro Exterior", "Garajes, Parqueaderos y Sótanos",
  "Habitaciones y Alcobas", "Jardines y Zonas Verdes", "Líneas de Producción",
  "Sala y Comedor", "Silos y Tolvas", "Techo y Cielo Raso", "Zona de Basuras y Shut",
  "Zonas de Carga y Despachos", "Zonas de Lavado y Lavandería", "Tanques Elevados",
  "Tanques Subterráneos", "Tanques a Nivel de Piso"
]

const METODOS_POR_TIPO = {
  desinsectacion: ["Pulverización líquida", "Nebulización en frío (ULV)", "Termonebulización", "Aplicación de gel", "Polvo insecticida", "Cebos", "Trampas de luz UV", "Trampas de feromonas", "Otro método"],
  desratizacion: ["Rodenticidas en cebo", "Trampas mecánicas", "Trampas de pegamento", "Fumigación con fosfuro de aluminio", "Otro método"],
  desinfeccion: ["Pulverización química", "Nebulización", "Ozono", "Luz UV-C", "Vapor", "Otro método"],
  desodoracion: ["Nebulización de desodorante", "Ozono", "Biofiltros", "Atomización", "Otro método"],
  default: ["Pulverización líquida", "Nebulización", "Otro método"]
}

function getMetodosPorTipo(tipo) {
  const t = tipo.toLowerCase()
  if (t.includes('insect') || t.includes('fumig')) return METODOS_POR_TIPO.desinsectacion
  if (t.includes('rat') || t.includes('roe')) return METODOS_POR_TIPO.desratizacion
  if (t.includes('infec') || t.includes('sani')) return METODOS_POR_TIPO.desinfeccion
  if (t.includes('odor') || t.includes('olor')) return METODOS_POR_TIPO.desodoracion
  return METODOS_POR_TIPO.default
}

function parseMetodos(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore parse error, fallback to legacy
  }
  // Legacy: plain comma string → convert to ungrouped format
  return raw.split(', ').filter(Boolean).map(m => ({ tipo: 'General', metodo: m }))
}

function parseAreas(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore parse error, fallback to legacy
  }
  return raw.split(', ').filter(Boolean).map(a => ({ tipo: 'General', area: a }))
}

export default function OrdenTecnicoDetalles({
  orden,
  setOrden,
  setFotos,
  isAssignedTecnico,
  queueOrExecute,
  queuePhoto
}) {
  const [showAreasModal, setShowAreasModal] = useState(false)
  const [activeTipoControlArea, setActiveTipoControlArea] = useState('')
  // selectedAreas: [{tipo, area}]
  const [selectedAreas, setSelectedAreas] = useState([])
  const [savingAreas, setSavingAreas] = useState(false)

  const [showMetodosModal, setShowMetodosModal] = useState(false)
  const [activeTipoControl, setActiveTipoControl] = useState('')
  // selectedMetodos: [{tipo, metodo}]
  const [selectedMetodos, setSelectedMetodos] = useState([])
  const [savingMetodos, setSavingMetodos] = useState(false)

  const [showRecomendacionesModal, setShowRecomendacionesModal] = useState(false)
  const [recomendacionesText, setRecomendacionesText] = useState(orden.recomendaciones || '')
  const [recommendationPhotos, setRecommendationPhotos] = useState([])
  const [savingRecomendaciones, setSavingRecomendaciones] = useState(false)

  const canEdit = isAssignedTecnico && orden.estado === 'en_progreso'
  const tiposControl = parseTipoPlaga(orden.tipo_plaga)
  const metodosGuardados = parseMetodos(orden.metodos_aplicacion)
  const areasGuardadas = parseAreas(orden.areas_intervenidas)

  function toggleMetodo(tipo, metodo) {
    const exists = selectedMetodos.some(m => m.tipo === tipo && m.metodo === metodo)
    if (exists) {
      setSelectedMetodos(selectedMetodos.filter(m => !(m.tipo === tipo && m.metodo === metodo)))
    } else {
      setSelectedMetodos([...selectedMetodos, { tipo, metodo }])
    }
  }

  function isMetodoSelected(tipo, metodo) {
    return selectedMetodos.some(m => m.tipo === tipo && m.metodo === metodo)
  }

  function toggleArea(tipo, area) {
    const exists = selectedAreas.some(a => a.tipo === tipo && a.area === area)
    if (exists) {
      setSelectedAreas(selectedAreas.filter(a => !(a.tipo === tipo && a.area === area)))
    } else {
      setSelectedAreas([...selectedAreas, { tipo, area }])
    }
  }

  function isAreaSelected(tipo, area) {
    return selectedAreas.some(a => a.tipo === tipo && a.area === area)
  }

  async function handleSaveAreas() {
    setSavingAreas(true)
    try {
      const areaJson = JSON.stringify(selectedAreas)
      const { queued } = await queueOrExecute('ordenes_servicio', 'update', { id: orden.id, areas_intervenidas: areaJson }, orden.id)
      setOrden(prev => ({ ...prev, areas_intervenidas: areaJson }))
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
      const metJson = JSON.stringify(selectedMetodos)
      const { queued } = await queueOrExecute('ordenes_servicio', 'update', { id: orden.id, metodos_aplicacion: metJson }, orden.id)
      setOrden(prev => ({ ...prev, metodos_aplicacion: metJson }))
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
    } catch {
      toast.error('Error guardando recomendaciones')
    } finally {
      setSavingRecomendaciones(false)
    }
  }

  // Group guardados by tipo for display
  const metodosPorTipoDisplay = metodosGuardados.reduce((acc, m) => {
    if (!acc[m.tipo]) acc[m.tipo] = []
    acc[m.tipo].push(m.metodo)
    return acc
  }, {})

  const areasPorTipoDisplay = areasGuardadas.reduce((acc, a) => {
    if (!acc[a.tipo]) acc[a.tipo] = []
    acc[a.tipo].push(a.area)
    return acc
  }, {})

  return (
    <>


      {/* Métodos */}
      <div className="card mt-6 border-t-4 border-t-indigo-400 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" /> Métodos de Aplicación
          </h2>
          {canEdit && (
            <button onClick={() => {
              setSelectedMetodos(parseMetodos(orden.metodos_aplicacion))
              setActiveTipoControl(parseTipoPlaga(orden.tipo_plaga)[0] || '')
              setShowMetodosModal(true)
            }} className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Seleccionar Métodos
            </button>
          )}
        </div>
        {metodosGuardados.length > 0 ? (
          <div className="space-y-3">
            {Object.entries(metodosPorTipoDisplay).map(([tipo, metodos]) => (
              <div key={tipo}>
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">{tipo}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {metodos.map((m, idx) => (
                    <span key={idx} className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">{m}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-dark-400">No se han especificado métodos...</span>
        )}
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

      {/* Modal Áreas */}
      {showAreasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between">
              <h3 className="font-bold text-dark-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-indigo-600" /> Seleccionar Áreas Intervenidas</h3>
              <button onClick={() => setShowAreasModal(false)} className="p-2 hover:bg-dark-50 rounded-lg text-dark-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {tiposControl.length > 0 ? (
                <div>
                  <div className="mb-4">
                    <label className="label-field">Tipo de Control</label>
                    <select
                      className="input-field"
                      value={activeTipoControlArea}
                      onChange={e => setActiveTipoControlArea(e.target.value)}
                    >
                      {tiposControl.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                  
                  {activeTipoControlArea && (
                    <div>
                      <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-3 pb-1 border-b border-indigo-100">
                        Áreas para {activeTipoControlArea}
                      </h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {OPCIONES_AREAS.map(area => (
                          <label key={area} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isAreaSelected(activeTipoControlArea, area) ? 'bg-indigo-50/50 border-indigo-300' : 'bg-dark-50 border-dark-100 hover:border-dark-300'}`}>
                            <input type="checkbox" checked={isAreaSelected(activeTipoControlArea, area)} onChange={() => toggleArea(activeTipoControlArea, area)} className="w-4 h-4 rounded border-dark-300 text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm font-medium text-dark-800 leading-tight">{area}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-dark-400 text-center py-4">La orden no tiene tipos de control definidos. Edita la orden para agregarlos.</p>
              )}
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

      {/* Modal Métodos */}
      {showMetodosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-dark-900">Métodos de Aplicación por Tipo de Control</h3>
                <p className="text-xs text-dark-500 mt-0.5">Selecciona los métodos utilizados para cada tipo de control</p>
              </div>
              <button onClick={() => setShowMetodosModal(false)} className="p-2 hover:bg-dark-50 rounded-lg text-dark-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {tiposControl.length > 0 ? (
                <div>
                  <div className="mb-4">
                    <label className="label-field">Tipo de Control</label>
                    <select
                      className="input-field"
                      value={activeTipoControl}
                      onChange={e => setActiveTipoControl(e.target.value)}
                    >
                      {tiposControl.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                  
                  {activeTipoControl && (
                    <div>
                      <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-3 pb-1 border-b border-indigo-100">
                        Métodos para {activeTipoControl}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {getMetodosPorTipo(activeTipoControl).map(met => (
                          <label key={met} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isMetodoSelected(activeTipoControl, met) ? 'bg-primary-50 border-primary-200' : 'bg-white border-dark-200 hover:border-primary-300'}`}>
                            <input
                              type="checkbox"
                              checked={isMetodoSelected(activeTipoControl, met)}
                              onChange={() => toggleMetodo(activeTipoControl, met)}
                              className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm font-medium text-dark-700">{met}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-dark-400 text-center py-4">La orden no tiene tipos de control definidos. Edita la orden para agregarlos.</p>
              )}
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

      {/* Modal Recomendaciones */}
      {showRecomendacionesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
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


