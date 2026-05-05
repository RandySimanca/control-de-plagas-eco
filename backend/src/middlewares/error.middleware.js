import { AppError } from '../utils/AppError.js'

export function errorHandler (err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    })
  }

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'El recurso ya existe (violación de unicidad).'
    })
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida (clave foránea).'
    })
  }

  console.error(err)
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message
  })
}
