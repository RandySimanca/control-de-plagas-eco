export function getAuthImageUrl(url) {
  if (!url) return url;

  if (typeof url === 'string') {
    // Si ya es una URL absoluta (http/https), devolverla tal cual
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Asegurar que tenga el token si es una URL de uploads
      if (url.includes('/uploads/')) {
        const token = localStorage.getItem('token');
        if (token && !url.includes('token=')) {
          const separator = url.includes('?') ? '&' : '?';
          return `${url}${separator}token=${token}`;
        }
      }
      return url;
    }

    // URLs de datos o blobs se devuelven tal cual
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    let cleanUrl = url.trim();
    if (cleanUrl.startsWith('uploads/')) {
      cleanUrl = '/' + cleanUrl;
    }

    const uploadsIndex = cleanUrl.indexOf('/uploads/');
    let path = cleanUrl;

    if (uploadsIndex !== -1) {
      path = cleanUrl.substring(uploadsIndex);
    } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      const cleanPath = cleanUrl.replace(/^\//, '');
      path = `/uploads/${cleanPath}`;
    }

    if (path.startsWith('/uploads/')) {
      const token = localStorage.getItem('token');
      if (token && !path.includes('token=')) {
        const separator = path.includes('?') ? '&' : '?';
        path = `${path}${separator}token=${token}`;
      }

      // En Docker/túneles, usar la URL base actual del navegador
      const currentOrigin = window.location.origin;
      return `${currentOrigin}${path}`;
    }

    return path;
  }
  return url;
}

