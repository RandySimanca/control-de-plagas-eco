import { useState, useEffect } from 'react'
import {
  X, Save, Loader2, Plus, Trash2, Upload, ClipboardList, CheckCircle2
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../lib/api'
import { getAuthImageUrl } from '../../../utils/imageUtils'
import { generateUUID } from '../../../utils/uuid'
import { EMPTY_RELEVAMIENTO, NIVELES_ACUMULACION } from '../../../utils/tipoVisitaConfig'

function normalizeRelevamiento(data) {
  if (!data) return { ...EMPTY_RELEVAMIENTO }
  return {
    ...EMPTY_RELEVAMIENTO,
    ...data,
    especies: data.especies || [],
    puntos_acceso: data.puntos_acceso?.length ? data.puntos_acceso : [''],
    lugares_anidamiento: data.lugares_anidamiento?.length ? data.lugares_anidamiento : [''],
    materiales_estimados: data.materiales_estimados?.length
      ? data.materiales_estimados
      : [{ nombre: '', cantidad: '', observacion: '' }],
    fotos: data.fotos || []
  }
}

export default function RelevamientoModal({
  isOpen,
  onClose,
  ordenId,
  relevamiento,
  setRelevamiento,
  especiesOpciones = [],
  canEdit,
  queuePhoto,
  queueOrExecute
}) {
  const [form, setForm] = useState(normalizeRelevamiento(relevamiento))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      setForm(normalizeRelevamiento(relevamiento))
      setErrors({})
    }
  }, [isOpen, relevamiento])

  if (!isOpen) return null

  function toggleEspecie(especie) {
    setForm(prev => {
      const actuales = prev.especies || []
      const existe = actuales.includes(especie)
      return {
        ...prev,
        especies: existe ? actuales.filter(e => e !== especie) : [...actuales, especie]
      }
    })
  }

  function updateLista(campo, idx, valor) {
    setForm(prev => {
      const lista = [...(prev[campo] || [])]
      lista[idx] = valor
      return { ...prev, [campo]: lista }
    })
  }

  function addListaItem(campo) {
    setForm(prev => ({ ...prev, [campo]: [...(prev[campo] || []), ''] }))
  }

  function removeListaItem(campo, idx) {
    setForm(prev => {
      const lista = (prev[campo] || []).filter((_, i) => i !== idx)
      return { ...prev, [campo]: lista.length ? lista : [''] }
    })
  }

  function updateMaterial(idx, field, value) {
    setForm(prev => {
      const mats = [...(prev.materiales_estimados || [])]
      mats[idx] = { ...mats[idx], [field]: value }
      return { ...prev, materiales_estimados: mats }
    })
  }

  function addMaterial() {
    setForm(prev => ({
      ...prev,
      materiales_estimados: [...(prev.materiales_estimados || []), { nombre: '', cantidad: '', observacion: '' }]
    }))
  }

  function removeMaterial(idx) {
    setForm(prev => ({
      ...prev,
      materiales_estimados: (prev.materiales_estimados || []).filter((_, i) => i !== idx)
    }))
  }

  function validate(completo = false) {
    const next = {}
    if (completo) {
      if (!form.especies?.length) next.especies = 'Selecciona al menos una especie'
      if (!form.ubicacion?.trim()) next.ubicacion = 'La ubicación es obligatoria'
      if (!form.diagnostico?.trim()) next.diagnostico = 'El diagnóstico es obligatorio'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave(estado) {
    const completo = estado === 'completo'
    if (completo && !validate(true)) {
      toast.error('Completa los campos obligatorios antes de finalizar')
      return
    }

    setSaving(true)
    try {
      const payload = {
        orden_id: ordenId,
        estado,
        especies: form.especies,
        ubicacion: form.ubicacion?.trim() || null,
        area_afectada_valor: form.area_afectada_valor ? parseFloat(form.area_afectada_valor) : null,
        area_afectada_unidad: form.area_afectada_unidad || 'm²',
        altura_estructura: form.altura_estructura?.trim() || null,
        puntos_acceso: (form.puntos_acceso || []).map(s => s.trim()).filter(Boolean),
        lugares_anidamiento: (form.lugares_anidamiento || []).map(s => s.trim()).filter(Boolean),
        nivel_acumulacion: form.nivel_acumulacion || null,
        riesgos: form.riesgos?.trim() || null,
        sistema_control_recomendado: form.sistema_control_recomendado?.trim() || null,
        materiales_estimados: (form.materiales_estimados || [])
          .filter(m => m.nombre?.trim())
          .map(m => ({
            nombre: m.nombre.trim(),
            cantidad: m.cantidad?.trim() || null,
            observacion: m.observacion?.trim() || null
          })),
        diagnostico: form.diagnostico?.trim() || null,
        solucion_propuesta: form.solucion_propuesta?.trim() || null
      }

      const token = localStorage.getItem('token')
      const { data } = await api.post('/relevamientos', payload, { token })
      const saved = { ...data, fotos: form.fotos }
      setRelevamiento(saved)
      setForm(normalizeRelevamiento(saved))
      toast.success(estado === 'completo' ? 'Relevamiento completado' : 'Borrador guardado')
      if (estado === 'completo') onClose()
    } catch (err) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadFotos(e) {
    if (!e.target.files?.length || !relevamiento?.id) {
      if (!relevamiento?.id) toast.error('Guarda el borrador primero para adjuntar fotos')
      return
    }
    const files = Array.from(e.target.files)
    setUploading(true)
    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const path = `relevamientos/rel_${ordenId}_${Date.now()}_${safeName}`
        const dbPayload = {
          id: generateUUID(),
          relevamiento_id: relevamiento.id,
          storage_path: path,
          descripcion: ''
        }
        const { publicUrl } = await queuePhoto(
          'fotos-servicio', path, file, file.type,
          'fotos_relevamiento', dbPayload, ordenId
        )
        const nueva = { ...dbPayload, url: publicUrl }
        setForm(prev => ({ ...prev, fotos: [...(prev.fotos || []), nueva] }))
        setRelevamiento(prev => prev ? { ...prev, fotos: [...(prev.fotos || []), nueva] } : prev)
      }
      toast.success('Fotos agregadas')
    } catch (err) {
      toast.error('Error con fotos: ' + err.message)
    } finally {
      setUploading(false)
      if (e.target) e.target.value = null
    }
  }

  async function handleUpdateCaption(fotoId, descripcion) {
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/fotos-relevamiento/${fotoId}`, { descripcion }, { token })
      const updater = f => f.id === fotoId ? { ...f, descripcion } : f
      setForm(prev => ({ ...prev, fotos: (prev.fotos || []).map(updater) }))
      setRelevamiento(prev => prev ? { ...prev, fotos: (prev.fotos || []).map(updater) } : prev)
    } catch (err) {
      toast.error('Error al actualizar descripción')
    }
  }

  async function handleDeleteFoto(foto) {
    try {
      const token = localStorage.getItem('token')
      await api.delete(`/fotos-relevamiento/${foto.id}`, { token })
      setForm(prev => ({ ...prev, fotos: (prev.fotos || []).filter(f => f.id !== foto.id) }))
      setRelevamiento(prev => prev ? { ...prev, fotos: (prev.fotos || []).filter(f => f.id !== foto.id) } : prev)
      toast.success('Foto eliminada')
    } catch (err) {
      toast.error('Error al eliminar foto')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-dark-100">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-dark-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-dark-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" /> Relevamiento Técnico
            </h3>
            <p className="text-xs text-dark-400 mt-0.5">
              Estado: <span className={form.estado === 'completo' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                {form.estado === 'completo' ? 'Completo' : 'Borrador'}
              </span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-dark-100 hover:bg-dark-200 flex items-center justify-center">
            <X className="w-5 h-5 text-dark-600" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-5 flex-1">
          {/* Especies */}
          <div>
            <label className="label-field">Especie causante del problema *</label>
            <div className="flex flex-wrap gap-2">
              {especiesOpciones.map(especie => {
                const sel = (form.especies || []).includes(especie)
                return (
                  <button
                    key={especie}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggleEspecie(especie)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${sel ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-dark-700 border-dark-200 hover:bg-dark-50'}`}
                  >
                    {especie}
                  </button>
                )
              })}
            </div>
            {errors.especies && <p className="text-xs text-red-500 mt-1">{errors.especies}</p>}
          </div>

          {/* Ubicación y área */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Ubicación en el predio *</label>
              <input
                className={`input-field ${errors.ubicacion ? 'border-red-500' : ''}`}
                value={form.ubicacion}
                disabled={!canEdit}
                onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))}
                placeholder="Ej: Techo norte, bodega 2..."
              />
              {errors.ubicacion && <p className="text-xs text-red-500 mt-1">{errors.ubicacion}</p>}
            </div>
            <div>
              <label className="label-field">Área afectada aproximada</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  className="input-field flex-1"
                  value={form.area_afectada_valor}
                  disabled={!canEdit}
                  onChange={e => setForm(p => ({ ...p, area_afectada_valor: e.target.value }))}
                  placeholder="0"
                />
                <select
                  className="input-field w-24"
                  value={form.area_afectada_unidad}
                  disabled={!canEdit}
                  onChange={e => setForm(p => ({ ...p, area_afectada_unidad: e.target.value }))}
                >
                  <option value="m²">m²</option>
                  <option value="m³">m³</option>
                  <option value="ml">ml</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="label-field">Altura y características de la estructura</label>
            <textarea className="input-field" rows={2} disabled={!canEdit} value={form.altura_estructura} onChange={e => setForm(p => ({ ...p, altura_estructura: e.target.value }))} />
          </div>

          {/* Listas repetibles */}
          {['puntos_acceso', 'lugares_anidamiento'].map(campo => (
            <div key={campo}>
              <label className="label-field">
                {campo === 'puntos_acceso' ? 'Puntos de acceso detectados' : 'Lugares de anidamiento o descanso'}
              </label>
              <div className="space-y-2">
                {(form[campo] || []).map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      className="input-field flex-1"
                      value={item}
                      disabled={!canEdit}
                      onChange={e => updateLista(campo, idx, e.target.value)}
                      placeholder="Describa..."
                    />
                    {canEdit && (form[campo] || []).length > 1 && (
                      <button type="button" onClick={() => removeListaItem(campo, idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <button type="button" onClick={() => addListaItem(campo)} className="text-sm text-indigo-600 font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Agregar
                  </button>
                )}
              </div>
            </div>
          ))}

          <div>
            <label className="label-field">Nivel de acumulación de excrementos/residuos</label>
            <select className="input-field" disabled={!canEdit} value={form.nivel_acumulacion} onChange={e => setForm(p => ({ ...p, nivel_acumulacion: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {NIVELES_ACUMULACION.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label-field">Riesgos y dificultades para realizar el trabajo</label>
            <textarea className="input-field" rows={2} disabled={!canEdit} value={form.riesgos} onChange={e => setForm(p => ({ ...p, riesgos: e.target.value }))} />
          </div>

          {/* Fotos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-field mb-0">Fotografías de evidencia</label>
              {canEdit && relevamiento?.id && (
                <label className="btn-secondary text-xs py-1 px-3 cursor-pointer relative">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 inline mr-1" />Subir</>}
                  <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUploadFotos} disabled={uploading} />
                </label>
              )}
            </div>
            {!relevamiento?.id && (
              <p className="text-xs text-amber-600 mb-2">Guarda un borrador primero para poder adjuntar fotos.</p>
            )}
            {(form.fotos || []).length === 0 ? (
              <div className="text-center py-6 bg-dark-50 rounded-xl border border-dashed border-dark-200 text-sm text-dark-400">
                Sin fotografías
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(form.fotos || []).map(foto => (
                  <div key={foto.id} className="border border-dark-200 rounded-xl overflow-hidden">
                    <div className="aspect-video bg-dark-100">
                      <img src={getAuthImageUrl(foto.url)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2 space-y-1">
                      <input
                        className="input-field text-xs"
                        placeholder="Descripción / caption"
                        value={foto.descripcion || ''}
                        disabled={!canEdit}
                        onChange={e => {
                          const val = e.target.value
                          setForm(prev => ({
                            ...prev,
                            fotos: (prev.fotos || []).map(f => f.id === foto.id ? { ...f, descripcion: val } : f)
                          }))
                        }}
                        onBlur={e => handleUpdateCaption(foto.id, e.target.value)}
                      />
                      {canEdit && (
                        <button type="button" onClick={() => handleDeleteFoto(foto)} className="text-xs text-red-500 hover:underline">
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label-field">Sistema de control recomendado</label>
            <input className="input-field" disabled={!canEdit} value={form.sistema_control_recomendado} onChange={e => setForm(p => ({ ...p, sistema_control_recomendado: e.target.value }))} />
          </div>

          {/* Materiales */}
          <div>
            <label className="label-field">Materiales, equipos y mano de obra estimados</label>
            <div className="space-y-2">
              {(form.materiales_estimados || []).map((mat, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <input className="input-field col-span-5 text-sm" placeholder="Nombre" disabled={!canEdit} value={mat.nombre} onChange={e => updateMaterial(idx, 'nombre', e.target.value)} />
                  <input className="input-field col-span-2 text-sm" placeholder="Cant." disabled={!canEdit} value={mat.cantidad} onChange={e => updateMaterial(idx, 'cantidad', e.target.value)} />
                  <input className="input-field col-span-4 text-sm" placeholder="Observación" disabled={!canEdit} value={mat.observacion} onChange={e => updateMaterial(idx, 'observacion', e.target.value)} />
                  {canEdit && (
                    <button type="button" onClick={() => removeMaterial(idx)} className="col-span-1 p-2 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <button type="button" onClick={addMaterial} className="text-sm text-indigo-600 font-medium flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Agregar ítem
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="label-field">Diagnóstico técnico *</label>
            <textarea className={`input-field ${errors.diagnostico ? 'border-red-500' : ''}`} rows={3} disabled={!canEdit} value={form.diagnostico} onChange={e => setForm(p => ({ ...p, diagnostico: e.target.value }))} />
            {errors.diagnostico && <p className="text-xs text-red-500 mt-1">{errors.diagnostico}</p>}
          </div>

          <div>
            <label className="label-field">Solución propuesta</label>
            <textarea className="input-field" rows={3} disabled={!canEdit} value={form.solucion_propuesta} onChange={e => setForm(p => ({ ...p, solucion_propuesta: e.target.value }))} />
          </div>
        </div>

        {canEdit && (
          <div className="p-4 border-t border-dark-100 flex flex-col sm:flex-row gap-2 shrink-0">
            <button type="button" onClick={() => handleSave('borrador')} disabled={saving} className="btn-secondary flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Guardar borrador'}
            </button>
            <button type="button" onClick={() => handleSave('completo')} disabled={saving} className="btn-primary flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <><CheckCircle2 className="w-4 h-4 inline mr-1" />Completar relevamiento</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
