import { catchAsync } from '../../utils/catchAsync.js'
import { AppError } from '../../utils/AppError.js'
import * as authService from './auth.service.js'

function assertBody (req, fields) {
  for (const f of fields) {
    if (req.body[f] === undefined || req.body[f] === '') {
      throw new AppError(`Campo requerido: ${f}`, 400)
    }
  }
}

export const register = catchAsync(async (req, res) => {
  assertBody(req, ['email', 'password', 'nombre', 'role'])
  const { email, password, nombre, role } = req.body
  if (password.length < 8) {
    throw new AppError('La contraseña debe tener al menos 8 caracteres', 400)
  }
  const result = await authService.register({ email, password, nombre, role })
  res.status(201).json({ success: true, ...result })
})

export const login = catchAsync(async (req, res) => {
  assertBody(req, ['email', 'password'])
  const result = await authService.login(req.body)
  res.json({ success: true, ...result })
})

export const me = catchAsync(async (req, res) => {
  const user = await authService.getMe(req.user.id)
  // Rename 'role' to 'rol' to match frontend expectations
  const { role, ...rest } = user
  res.json({ success: true, user: { ...rest, rol: role } })
})
