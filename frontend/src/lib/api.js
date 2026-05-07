const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function buildHeaders(token, hasBody) {
  const headers = {}
  if (hasBody) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export async function apiRequest(path, { method = 'GET', body, token, params } = {}) {
  let url = `${API_URL}${path}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, String(params[key]));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) url += `?${queryString}`;
  }

  const res = await fetch(url, {
    method,
    headers: buildHeaders(token, body !== undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.message || `Error HTTP ${res.status}`
    throw new Error(message)
  }
  return data
}

export const api = {
  get: (path, options = {}) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => apiRequest(path, { ...options, method: 'DELETE' })
}

export default api
