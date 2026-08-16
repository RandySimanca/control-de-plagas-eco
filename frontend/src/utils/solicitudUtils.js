/**
 * Construye texto de cotización a partir del relevamiento técnico completado.
 */
export function buildDescripcionCotizacionFromRelevamiento(relevamiento) {
  if (!relevamiento) return ''

  const parts = []

  if (relevamiento.diagnostico?.trim()) {
    parts.push(`Diagnóstico: ${relevamiento.diagnostico.trim()}`)
  }

  if (relevamiento.solucion_propuesta?.trim()) {
    parts.push(`Solución propuesta:\n${relevamiento.solucion_propuesta.trim()}`)
  }

  const materiales = relevamiento.materiales_estimados
  if (Array.isArray(materiales) && materiales.length > 0) {
    const lines = materiales
      .filter(m => m?.nombre?.trim())
      .map(m => {
        let line = `• ${m.nombre.trim()}`
        if (m.cantidad?.trim()) line += ` (${m.cantidad.trim()})`
        if (m.observacion?.trim()) line += ` — ${m.observacion.trim()}`
        return line
      })
    if (lines.length > 0) {
      parts.push(`Conceptos del servicio:\n${lines.join('\n')}`)
    }
  }

  if (relevamiento.sistema_control_recomendado?.trim()) {
    parts.push(`Sistema recomendado: ${relevamiento.sistema_control_recomendado.trim()}`)
  }

  return parts.join('\n\n')
}

export const ESTADO_SOLICITUD_LABELS = {
  pendiente: 'Pendiente',
  condiciones_enviadas: 'Condiciones enviadas',
  visita_aprobada: 'Visita aprobada',
  en_evaluacion: 'Visita en curso',
  informe_disponible: 'Informe disponible',
  cotizacion_solicitada: 'Cotización solicitada',
  cotizada: 'Cotización enviada',
  aceptada: 'Servicio aceptado',
  rechazada: 'Rechazada',
  convertida: 'En ejecución'
}

export function formatPrecioCol(val) {
  return Number(val || 0).toLocaleString('es-CO')
}

/** Calcula neto al descontar costo de visita técnica si el cliente contrata el servicio. */
export function calcCotizacionConVisita(precioBruto, costoVisita, descontar = true) {
  const bruto = Number(precioBruto) || 0
  const costo = Number(costoVisita) || 0
  const descuento = descontar && costo > 0 ? costo : 0
  return {
    bruto,
    costoVisita: costo,
    descuento,
    neto: Math.max(0, bruto - descuento)
  }
}

export function tieneDesgloseVisita(sol) {
  return Number(sol?.costo_visita_tecnica) > 0 && Number(sol?.descuento_visita_tecnica) > 0
}

/** Texto base para condiciones de visita técnica antes de programar. */
export function buildCondicionesVisitaDefault(tipoServicio, costoVisita = 0) {
  const costo = Number(costoVisita) || 0
  const servicio = tipoServicio || 'servicio solicitado'

  let text = `Para evaluar su solicitud de ${servicio}, realizaremos una visita técnica en el sitio.\n\n`
  text += 'En esta visita nuestro técnico inspeccionará el lugar, identificará la problemática y levantará un relevamiento para definir el alcance del trabajo a realizar.\n\n'

  if (costo > 0) {
    text += `Costo de la visita técnica: $${formatPrecioCol(costo)}\n\n`
    text += '• Si después de la visita usted contrata el servicio con nosotros, este costo se descontará de la cotización final del servicio.\n'
    text += '• Si decide no contratar el servicio, solo deberá pagar el costo de la visita técnica.\n\n'
  } else {
    text += 'Esta visita técnica no tiene costo adicional.\n\n'
  }

  text += 'Al aceptar estas condiciones, autoriza la programación de la visita técnica bajo lo indicado.'
  return text
}

export function findInformeForSolicitud(solicitud, informes = []) {
  if (!solicitud?.orden_visita_id) return null
  return informes.find(i =>
    i.orden_id === solicitud.orden_visita_id ||
    i.ordenes_servicio?.id === solicitud.orden_visita_id
  )
}