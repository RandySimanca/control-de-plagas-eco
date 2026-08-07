/**
 * Parsea una fecha manteniendo la fecha local de un string YYYY-MM-DD sin desfasar la zona horaria.
 */
export function parseLocalDate(fecha) {
  if (!fecha) return null;
  if (fecha instanceof Date) return isNaN(fecha.getTime()) ? null : fecha;
  
  if (typeof fecha === 'string') {
    const cleanStr = fecha.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Formatea una fecha de tipo YYYY-MM-DD a formato localizado (ej. "08/08/2026").
 */
export function formatFecha(fecha, options = { day: '2-digit', month: '2-digit', year: 'numeric' }, fallback = '') {
  const d = parseLocalDate(fecha);
  if (!d) return fallback;
  return d.toLocaleDateString('es-CO', options);
}

/**
 * Formatea una fecha a formato largo (ej. "8 de agosto de 2026" o "sábado, 8 de agosto de 2026").
 */
export function formatFechaLarga(fecha, includeWeekday = false, fallback = 'Sin fecha') {
  const d = parseLocalDate(fecha);
  if (!d) return fallback;
  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  if (includeWeekday) options.weekday = 'long';
  return d.toLocaleDateString('es-CO', options);
}
