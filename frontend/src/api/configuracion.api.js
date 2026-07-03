import api from '../lib/api'

export const getConfig = (token) => api.get('/configuracion', { token })
