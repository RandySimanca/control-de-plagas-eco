export function getAuthImageUrl(url) {
  if (!url) return url;
  
  if (typeof url === 'string') {
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
    }

    return path;
  }
  return url;
}

