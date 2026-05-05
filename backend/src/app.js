import express from 'express'
import cors from 'cors'
import { errorHandler } from './middlewares/error.middleware.js'
import authRoutes from './modules/auth/auth.routes.js'
import usersRoutes from './modules/users/users.routes.js'
import clientesRoutes from './modules/clientes/clientes.routes.js'
import tecnicosRoutes from './modules/tecnicos/tecnicos.routes.js'
import serviciosRoutes from './modules/servicios/servicios.routes.js'

export function createApp () {
  const app = express()

  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'plagcontrol-api' })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/users', usersRoutes)
  app.use('/api/clientes', clientesRoutes)
  app.use('/api/tecnicos', tecnicosRoutes)
  app.use('/api/servicios', serviciosRoutes)

  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' })
  })

  app.use(errorHandler)
  return app
}
