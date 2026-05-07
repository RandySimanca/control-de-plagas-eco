import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { errorHandler } from './middlewares/error.middleware.js'
import { pool } from './config/database.js'
import { config } from './config/index.js'
import authRoutes from './modules/auth/auth.routes.js'
import usersRoutes from './modules/users/users.routes.js'
import clientesRoutes from './modules/clientes/clientes.routes.js'
import tecnicosRoutes from './modules/tecnicos/tecnicos.routes.js'
import serviciosRoutes from './modules/servicios/servicios.routes.js'
import configuracionRoutes from './modules/configuracion/configuracion.routes.js'
import documentosRoutes from './modules/documentos/documentos.routes.js'
import profilesRoutes from './modules/profiles/profiles.routes.js'
import uploadRoutes from './modules/upload/upload.routes.js'
import operacionesRoutes from './modules/operaciones/operaciones.routes.js'

export function createApp () {
  const app = express()

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads')
  fs.mkdirSync(uploadsDir, { recursive: true })

  // Serve uploaded files statically with CORS support
  app.use('/uploads', cors(), express.static(uploadsDir))

  app.use(cors({ origin: config.frontendUrl === '*' ? true : config.frontendUrl, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'plagcontrol-api' })
  })

  app.get('/health/db', async (req, res, next) => {
    try {
      const { rows } = await pool.query('SELECT NOW() AS db_time')
      res.json({ ok: true, db: 'postgres', time: rows[0].db_time })
    } catch (error) {
      next(error)
    }
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/users', usersRoutes)
  app.use('/api/clientes', clientesRoutes)
  app.use('/api/tecnicos', tecnicosRoutes)
  app.use('/api/servicios', serviciosRoutes)
  app.use('/api/configuracion', configuracionRoutes)
  app.use('/api/documentos-legales', documentosRoutes)
  app.use('/api/profiles', profilesRoutes)
  app.use('/api/upload', uploadRoutes)
  app.use('/api', operacionesRoutes)

  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' })
  })

  app.use(errorHandler)
  return app
}
