import api from '../lib/api'

export const listOrdenes = (token, filters = {}) => api.get('/servicios', { token, params: filters })
export const getOrdenById = (id, token) => api.get(`/servicios/${id}`, { token })
export const createOrden = (data, token) => api.post('/servicios', data, { token })
export const updateOrden = (id, data, token) => api.put(`/servicios/${id}`, data, { token })
export const deleteOrden = (id, token) => api.delete(`/servicios/${id}`, { token })

// Operaciones Detalle
export const getActividadesByOrden = (id, token) => api.get(`/actividades?orden_id=${id}`, { token })
export const getFotosByOrden = (id, token) => api.get(`/fotos?orden_id=${id}`, { token })
export const getProductosByOrden = (id, token) => api.get(`/productos?orden_id=${id}`, { token })
export const getEstacionesByOrden = (id, token) => api.get(`/estaciones?orden_id=${id}`, { token })
export const getCertificadoByOrden = (id, token) => api.get(`/certificados?orden_id=${id}`, { token })
export const getRelevamientoByOrden = (id, token) => api.get(`/ordenes/${id}/relevamiento`, { token })
export const upsertRelevamiento = (data, token) => api.post('/relevamientos', data, { token })
