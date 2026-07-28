export const TIPOS_ACTIVIDAD = [
  { id: 'inspeccion', label: 'Inspección' },
  { id: 'aplicacion', label: 'Aplicación' },
  { id: 'hallazgo', label: 'Hallazgo' },
  { id: 'monitoreo', label: 'Monitoreo' },
  { id: 'cierre', label: 'Cierre' }
]

export const AREAS_RAPIDAS = [
  'Cocina y Preparación de Alimentos',
  'Bodegas y Almacenamiento',
  'Baños y Vestieres',
  'Fachada y Perímetro Exterior',
  'Garajes, Parqueaderos y Sótanos',
  'Áreas Administrativas y Oficinas',
  'Zona de Basuras y Shut',
  'Tanques Elevados',
  'Tanques Subterráneos'
]

export const TIPOS_CONTROL = [
  'Desinsectación',
  'Desratización',
  'Desinfección',
  'Control de Aves',
  'Tratamiento Ecológico',
  'Otro'
]

export const PLANTILLAS = {
  inspeccion: 'Se realizó inspección visual en {area}. No se encontraron indicios de actividad.',
  aplicacion: 'Se aplicó producto en {area} según protocolo establecido.',
  hallazgo: 'Se detectó actividad en {area}. Se recomienda seguimiento.',
  monitoreo: 'Se revisaron estaciones y puntos de control en {area}.',
  cierre: 'Se finalizaron actividades en {area}. Área entregada conforme.'
}

export function getPlantilla(tipoId, area = '') {
  const plantilla = PLANTILLAS[tipoId] || 'Registro de avance en {area}.'
  const areaText = area || 'el área intervenida'
  return plantilla.replace(/\{area\}/g, areaText)
}

export function buildDescripcion(tipoControl, tipoLabel, area, detalle) {
  const suffix = area ? `${tipoLabel} · ${area}` : tipoLabel
  const prefix = tipoControl ? `[${tipoControl} | ${suffix}]` : `[${suffix}]`
  const texto = detalle.trim()
  return texto ? `${prefix} ${texto}` : prefix
}

export function parseDescripcion(descripcion) {
  if (!descripcion) {
    return { tipoControl: null, tipo: null, area: null, detalle: '' }
  }

  // Ejemplo: [Desratización | Inspección · Bodega] o [Inspección · Bodega] o [Inspección]
  const match = descripcion.match(/^\[(?:([^|\]]+)\s*\|\s*)?([^\·\]]+)(?: · ([^\]]+))?\]\s*(.*)$/s)
  if (match) {
    return {
      tipoControl: match[1]?.trim() || null,
      tipo: match[2]?.trim() || null,
      area: match[3]?.trim() || null,
      detalle: match[4]?.trim() || ''
    }
  }

  return { tipoControl: null, tipo: null, area: null, detalle: descripcion }
}

export function getFotosForActividad(fotos, actividadId) {
  if (!actividadId || !Array.isArray(fotos)) return []
  return fotos.filter(f =>
    f.storage_path?.includes(`actividades/${actividadId}/`) ||
    f.storage_path?.includes(`act_${actividadId}_`)
  )
}

export function getTipoBadgeClass(tipoLabel) {
  const normalized = tipoLabel?.toLowerCase() || ''
  if (normalized.includes('inspección') || normalized.includes('inspeccion')) {
    return 'bg-blue-100 text-blue-700'
  }
  if (normalized.includes('aplicación') || normalized.includes('aplicacion')) {
    return 'bg-emerald-100 text-emerald-700'
  }
  if (normalized.includes('hallazgo')) {
    return 'bg-amber-100 text-amber-800'
  }
  if (normalized.includes('monitoreo')) {
    return 'bg-violet-100 text-violet-700'
  }
  if (normalized.includes('cierre')) {
    return 'bg-green-100 text-green-800'
  }
  return 'bg-primary-100 text-primary-700'
}
