export function getAuthImageUrl(url) {
  if (!url) return url;
  
  if (typeof url === 'string') {
    const uploadsIndex = url.indexOf('/uploads/');
    if (uploadsIndex !== -1) {
      // Extraemos solo el path a partir de /uploads/ para evitar problemas de CORS o dominios locales (ej. localhost en un devtunnel)
      let path = url.substring(uploadsIndex);
      
      const token = localStorage.getItem('token');
      if (token && !path.includes('token=')) {
        const separator = path.includes('?') ? '&' : '?';
        path = `${path}${separator}token=${token}`;
      }
      return path;
    }
  }
  return url;
}
