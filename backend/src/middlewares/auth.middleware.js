import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

/**
 * Exige header Authorization: Bearer <token>
 * Asigna req.user = { id, role }
 */
export function authenticate (req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No autorizado' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.user = {
      id: payload.sub,
      role: payload.role
    }
    return next()
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' })
  }
}

export function requireAdmin (req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Solo administradores' })
  }
  return next()
}
