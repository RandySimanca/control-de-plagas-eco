import api from '../lib/api'

export const login = (email, password) => api.post('/auth/login', { email, password })
export const getMe = (token) => api.get('/auth/me', { token })
export const changePassword = (currentPassword, newPassword, token) => 
  api.post('/auth/change-password', { currentPassword, newPassword }, { token })
