import api from '../lib/api'

export const listClientes = (token) => api.get('/clientes', { token })
export const getClienteById = (id, token) => api.get(`/clientes/${id}`, { token })
export const createCliente = (data, token) => api.post('/clientes', data, { token })
export const updateCliente = (id, data, token) => api.put(`/clientes/${id}`, data, { token })
export const deleteCliente = (id, token) => api.delete(`/clientes/${id}`, { token })

export const listPlanos = (clienteId, token, sedeId) =>
  api.get(`/clientes/${clienteId}/planos`, { token, params: sedeId ? { sede_id: sedeId } : {} })

export const createPlano = (clienteId, data, token) =>
  api.post(`/clientes/${clienteId}/planos`, data, { token })

export const deletePlano = (clienteId, planoId, token) =>
  api.delete(`/clientes/${clienteId}/planos/${planoId}`, { token })

export const listEstacionesCliente = (clienteId, token, sedeId) =>
  api.get(`/clientes/${clienteId}/estaciones`, { token, params: sedeId ? { sede_id: sedeId } : {} })

export const updateEstacionCliente = (clienteId, estacionId, data, token) =>
  api.put(`/clientes/${clienteId}/estaciones/${estacionId}`, data, { token })
