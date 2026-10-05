import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as authController from './auth.controller.js'
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware.js'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Aumentado para soportar desarrollo con túneles
  message: { success: false, message: 'Demasiados intentos desde esta IP, por favor intente nuevamente en 15 minutos.' },
  skip: (req) => {
    // Omitir rate limiting cuando se usan headers de túnel o es desarrollo
    return process.env.NODE_ENV === 'development' ||
           req.headers['x-tunnel-skip-anti-phishing-page'] ||
           req.headers['ngrok-skip-browser-warning'] ||
           req.headers['x-forwarded-for'] // Usar X-Forwarded-For como indicador de proxy/túnel
  }
})

const router = Router()

// Crear usuarios solo puede hacerlo un admin autenticado.
// El flujo normal de creación de usuarios es POST /api/profiles (también con requireAdmin).
router.post('/register', authLimiter, authenticate, requireAdmin, authController.register)
router.post('/login', authLimiter, authController.login)
router.get('/me', authenticate, authController.me)
router.post('/change-password', authenticate, authController.changePassword)

export default router
