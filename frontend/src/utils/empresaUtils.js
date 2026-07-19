export function getEmpresaPrefix(nombreEmpresa) {
  if (!nombreEmpresa) return 'PC-';
  
  // Clean string and filter out short common connector words if possible, but keep it simple
  const cleanName = nombreEmpresa.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').trim();
  const words = cleanName.split(/\s+/).filter(w => !['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en'].includes(w.toLowerCase()));
  
  let prefix = 'PC';
  if (words.length >= 2) {
    prefix = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    prefix = words[0].substring(0, 2).toUpperCase();
  }
  
  return prefix + '-';
}

export function generateFolio(nombreEmpresa) {
  const prefix = getEmpresaPrefix(nombreEmpresa);
  const now = new Date();
  
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  
  return `${prefix}${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}
