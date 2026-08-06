import { useEffect, useRef, useState } from 'react'
import {
  X, ChevronLeft, ChevronRight, Camera, Trash2, Loader2,
  Search, Droplets, AlertTriangle, BarChart3, CheckCircle2, MapPin
} from 'lucide-react'
import {
  TIPOS_ACTIVIDAD,
  AREAS_RAPIDAS,
  TIPOS_CONTROL,
  getPlantilla,
  buildDescripcion
} from '../../../utils/actividadTemplates'
import { confirmAction } from '../../../lib/alerts'

const TIPO_ICONS = {
  inspeccion: Search,
  aplicacion: Droplets,
  hallazgo: AlertTriangle,
  monitoreo: BarChart3,
  cierre: CheckCircle2
}

const STEPS = [
  { id: 1, label: 'Tipo de Control' },
  { id: 2, label: 'Actividad' },
  { id: 3, label: 'Detalle' },
  { id: 4, label: 'Fotos' }
]

export default function ActividadWizardModal({
  isOpen,
  onClose,
  onSave,
  saving = false,
  ordenTipoPlaga,
  defaultTipoControl
}) {
  const [step, setStep] = useState(1)
  const [tipoControl, setTipoControl] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [area, setArea] = useState('')
  const [detalle, setDetalle] = useState('')
  const [photos, setPhotos] = useState([])
  const [submitReady, setSubmitReady] = useState(false)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const stepTransitionTimerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    if (defaultTipoControl) {
      setTipoControl(defaultTipoControl)
      setStep(2)
    } else {
      setTipoControl('')
      setStep(1)
    }
    setTipoId('')
    setArea('')
    setDetalle('')
    setPhotos([])
    setSubmitReady(false)
  }, [isOpen, defaultTipoControl])

  useEffect(() => {
    if (step !== 4) {
      setSubmitReady(false)
      return
    }

    setSubmitReady(false)
    if (stepTransitionTimerRef.current) {
      clearTimeout(stepTransitionTimerRef.current)
    }
    stepTransitionTimerRef.current = setTimeout(() => {
      setSubmitReady(true)
    }, 300)

    return () => {
      if (stepTransitionTimerRef.current) {
        clearTimeout(stepTransitionTimerRef.current)
      }
    }
  }, [step])

  useEffect(() => {
    return () => {
      photos.forEach(p => {
        if (p.preview?.startsWith('blob:')) URL.revokeObjectURL(p.preview)
      })
    }
  }, [photos])

  if (!isOpen) return null

  // --- Determinar opciones de "Tipo de Control" según la orden ---
  let controlesDisponibles = TIPOS_CONTROL
  if (ordenTipoPlaga) {
    let parseados = []
    if (Array.isArray(ordenTipoPlaga)) {
      parseados = ordenTipoPlaga
    } else if (typeof ordenTipoPlaga === 'string') {
      try {
        parseados = JSON.parse(ordenTipoPlaga)
      } catch (e) {
        parseados = ordenTipoPlaga.split(',').map(s => s.trim())
      }
    }
    // Filtrar todo lo que sea Lavado de Tanques
    parseados = parseados.filter(t => t.toLowerCase() !== 'lavado de tanques')
    
    if (parseados.length > 0) {
      controlesDisponibles = parseados
    }
  }

  const tipoSeleccionado = TIPOS_ACTIVIDAD.find(t => t.id === tipoId)
  const canGoStep2 = Boolean(tipoControl)
  const canGoStep3 = Boolean(tipoId)
  const canGoStep4 = detalle.trim().length > 0
  const canSave = canGoStep4

  function handleClose() {
    if (saving) return
    onClose()
  }

  function handleSelectTipo(id) {
    setTipoId(id)
    setDetalle(getPlantilla(id, area))
  }

  function handleSelectArea(nuevaArea) {
    const nextArea = area === nuevaArea ? '' : nuevaArea
    setArea(nextArea)
    if (tipoId) {
      setDetalle(getPlantilla(tipoId, nextArea))
    }
  }

  function addPhotoFiles(fileList) {
    if (!fileList?.length) return
    const nuevas = Array.from(fileList).map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file)
    }))
    setPhotos(prev => [...prev, ...nuevas])
  }

  function removePhoto(photoId) {
    setPhotos(prev => {
      const target = prev.find(p => p.id === photoId)
      if (target?.preview?.startsWith('blob:')) URL.revokeObjectURL(target.preview)
      return prev.filter(p => p.id !== photoId)
    })
  }

  function handleNext() {
    if (step === 1 && canGoStep2) setStep(2)
    else if (step === 2 && canGoStep3) setStep(3)
    else if (step === 3 && canGoStep4) setStep(4)
  }

  function handleBack() {
    if (defaultTipoControl && step === 2) return // Prevent returning to step 1
    if (step > 1) setStep(step - 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return

    if (step < 4) {
      handleNext()
      return
    }

    if (!canSave || !submitReady) return

    if (photos.length === 0) {
      const proceed = await confirmAction({
        title: '¿Guardar sin fotos?',
        text: 'No has agregado evidencia fotográfica. Puedes volver y subir fotos, o guardar el avance solo con la descripción.',
        confirmButtonText: 'Guardar sin fotos',
        cancelButtonText: 'Volver y subir fotos'
      })
      if (!proceed) return
    }

    const descripcion = buildDescripcion(tipoControl, tipoSeleccionado.label, area, detalle)
    await onSave({
      descripcion,
      photos: photos.map(p => p.file)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="relative bg-white w-full sm:max-w-lg sm:mx-4 max-h-[92vh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-dark-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-dark-900">Registrar Avance</h3>
              <p className="text-xs text-dark-400 mt-0.5">Paso {step} de 4 — {STEPS[step - 1].label}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="p-2 hover:bg-dark-50 rounded-lg text-dark-400 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2">
            {STEPS.map(s => {
              if (defaultTipoControl && s.id === 1) return null // Ocultar barra del paso 1 si ya está preseleccionado
              return (
                <div
                  key={s.id}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    s.id <= step ? 'bg-primary-500' : 'bg-dark-100'
                  }`}
                />
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Paso 1: Tipo de Control */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-dark-500">Selecciona el tipo de control al que pertenece la actividad.</p>
                <div className="grid grid-cols-2 gap-3">
                  {controlesDisponibles.map(tc => {
                    const selected = tipoControl === tc
                    return (
                      <button
                        key={tc}
                        type="button"
                        onClick={() => setTipoControl(tc)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                          selected
                            ? 'border-primary-500 bg-primary-50 text-primary-800 font-semibold'
                            : 'border-dark-100 bg-dark-50 text-dark-700 hover:border-primary-200'
                        }`}
                      >
                        <span className="text-sm">{tc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Paso 2: Tipo de Actividad */}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-dark-500">Selecciona el tipo de avance que vas a registrar.</p>
                <div className="grid grid-cols-2 gap-3">
                  {TIPOS_ACTIVIDAD.map(tipo => {
                    const Icon = TIPO_ICONS[tipo.id] || Search
                    const selected = tipoId === tipo.id
                    return (
                      <button
                        key={tipo.id}
                        type="button"
                        onClick={() => handleSelectTipo(tipo.id)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                          selected
                            ? 'border-primary-500 bg-primary-50 text-primary-800'
                            : 'border-dark-100 bg-dark-50 text-dark-700 hover:border-primary-200'
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${selected ? 'text-primary-600' : 'text-dark-400'}`} />
                        <span className="text-sm font-semibold">{tipo.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Paso 3: Detalle */}
            {step === 3 && (
              <div className="space-y-4">
                {tipoSeleccionado && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
                    {tipoSeleccionado.label}
                  </div>
                )}

                <div>
                  <label className="label-field flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Área (opcional)
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {AREAS_RAPIDAS.map(a => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => handleSelectArea(a)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          area === a
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-dark-600 border-dark-200 hover:border-primary-300'
                        }`}
                      >
                        {a.length > 28 ? `${a.slice(0, 26)}…` : a}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label-field">Descripción del trabajo</label>
                  <textarea
                    className="input-field min-h-[140px] resize-none mt-1"
                    value={detalle}
                    onChange={e => setDetalle(e.target.value)}
                    placeholder="Describe lo realizado en esta actividad..."
                    required
                  />
                  <p className="text-xs text-dark-400 mt-1.5">
                    Puedes editar la plantilla sugerida antes de continuar.
                  </p>
                </div>
              </div>
            )}

            {/* Paso 4: Fotos */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-dark-500">
                  Agrega evidencia fotográfica del avance (recomendado 2–6 fotos).
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <Camera className="w-7 h-7" />
                    <span className="text-sm font-semibold">Tomar foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-dark-200 bg-dark-50 text-dark-600 hover:border-primary-300 transition-colors"
                  >
                    <Camera className="w-7 h-7 text-dark-400" />
                    <span className="text-sm font-semibold">Desde galería</span>
                  </button>
                </div>

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => {
                    addPhotoFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => {
                    addPhotoFiles(e.target.files)
                    e.target.value = ''
                  }}
                />

                {photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map(photo => (
                      <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-dark-100">
                        <img
                          src={photo.preview}
                          alt="Vista previa"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-lg text-white hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-dark-50 rounded-xl border border-dashed border-dark-200">
                    <p className="text-sm text-dark-400">Sin fotos aún — se te pedirá confirmación al guardar</p>
                  </div>
                )}

                {photos.length > 0 && (
                  <p className="text-xs text-primary-600 font-medium">{photos.length} foto{photos.length !== 1 ? 's' : ''} lista{photos.length !== 1 ? 's' : ''}</p>
                )}
              </div>
            )}
          </div>

          {/* Footer acciones */}
          <div className="px-5 py-4 border-t border-dark-100 bg-white shrink-0 flex gap-3">
            {(step > 1 && !(defaultTipoControl && step === 2)) ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={saving}
                className="btn-secondary flex items-center justify-center gap-1 min-w-[100px]"
              >
                <ChevronLeft className="w-4 h-4" /> Atrás
              </button>
            ) : (
              <button type="button" onClick={handleClose} disabled={saving} className="btn-secondary">
                Cancelar
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={(step === 1 && !canGoStep2) || (step === 2 && !canGoStep3) || (step === 3 && !canGoStep4)}
                className="btn-primary flex-1 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSave || saving || !submitReady}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
                  </>
                ) : (
                  'Guardar Avance'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
