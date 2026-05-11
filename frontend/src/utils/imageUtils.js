export function getAuthImageUrl(url) {
  if (!url) return url;
  
  // Solo interceptamos URLs que contengan /uploads/
  if (typeof url === 'string' && url.includes('/uploads/')) {
    const token = localStorage.getItem('token');
    if (token) {
      // Evitar duplicar el token si ya está presente
      if (url.includes('token=')) return url;
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}token=${token}`;
    }
  }
  return url;
}
