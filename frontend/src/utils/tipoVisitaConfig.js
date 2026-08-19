export const TIPOS_VISITA = [
  { id: 'servicio', label: 'Servicio / Aplicación' },
  { id: 'tecnica', label: 'Visita Técnica (Relevamiento)' },
  { id: 'mantenimiento', label: 'Mantenimiento' }
]

export const TARJETAS_SERVICIO_MODAL = ['bitacora', 'productos', 'estaciones', 'detalles']

export const NIVELES_ACUMULACION = [
  { id: 'bajo', label: 'Bajo' },
  { id: 'medio', label: 'Medio' },
  { id: 'alto', label: 'Alto' }
]

export const ESPECIES_DEFAULT = ['Palomas', 'Roedores', 'Insectos', 'Aves', 'Murciélagos', 'Abejas', 'Otros']

export function isVisitaTecnica(orden) {
  return orden?.tipo_visita === 'tecnica'
}

export function getTipoVisitaLabel(tipoVisita) {
  return TIPOS_VISITA.find(t => t.id === tipoVisita)?.label || 'Servicio'
}

export function getTarjetasServicioModal(tipoVisita) {
  if (tipoVisita === 'tecnica') return []
  return TARJETAS_SERVICIO_MODAL
}

export function puedeGenerarInforme(relevamiento) {
  if (!relevamiento) return false
  const tieneEspecie = Array.isArray(relevamiento.especies) && relevamiento.especies.length > 0
  const tieneUbicacion = Boolean(relevamiento.ubicacion?.trim())
  const tieneDiagnostico = Boolean(relevamiento.diagnostico?.trim())
  return tieneEspecie && tieneUbicacion && tieneDiagnostico
}

export const EMPTY_RELEVAMIENTO = {
  estado: 'borrador',
  especies: [],
  ubicacion: '',
  area_afectada_valor: '',
  area_afectada_unidad: 'm²',
  altura_estructura: '',
  puntos_acceso: [''],
  lugares_anidamiento: [''],
  nivel_acumulacion: '',
  riesgos: '',
  sistema_control_recomendado: '',
  materiales_estimados: [{ nombre: '', cantidad: '', observacion: '' }],
  diagnostico: '',
  solucion_propuesta: '',
  fotos: []
}
