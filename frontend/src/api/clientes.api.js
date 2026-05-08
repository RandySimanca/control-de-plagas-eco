import api from '../lib/api'

export const listClientes = (token) => api.get('/clientes', { token })
export const getClienteById = (id, token) => api.get(`/clientes/${id}`, { token })
export const createCliente = (data, token) => api.post('/clientes', data, { token })
export const updateCliente = (id, data, token) => api.put(`/clientes/${id}`, data, { token })
export const deleteCliente = (id, token) => api.delete(`/clientes/${id}`, { token })
