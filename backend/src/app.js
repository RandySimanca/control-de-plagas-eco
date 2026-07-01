import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import helmet from 'helmet'
import { errorHandler } from './middlewares/error.middleware.js'
import { authenticate } from './middlewares/auth.middleware.js'
import { pool } from './config/database.js'
import { config } from './config/index.js'
import apiRoutes from './routes.js'

export function createApp () {
  const app = express()

  // Apply helmet for security headers. We disable CORP to allow our frontend to load images.
  app.use(helmet({ crossOriginResourcePolicy: false }))

  // Validación de origen: permite la(s) URL(s) configuradas en FRONTEND_URL
  // y, en desarrollo, cualquier subdominio de devtunnels.ms (útil porque
  // ese subdominio cambia cada vez que se reinicia el túnel).
  const devTunnelRegex = /^https:\/\/[a-z0-9-]+\.use2\.devtunnels\.ms$/i
  function corsOriginCheck (origin, callback) {
    if (config.frontendUrl === '*') return callback(null, true)
    if (!origin) return callback(null, true) // curl, Postman, health checks, etc.
    const isAllowed =
      config.frontendUrls.includes(origin) ||
      (config.nodeEnv === 'development' && devTunnelRegex.test(origin))
    if (isAllowed) return callback(null, true)
    callback(new Error(`Origen no permitido por CORS: ${origin}`))
  }

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads')
  fs.mkdirSync(uploadsDir, { recursive: true })

  // Serve uploaded files statically with CORS and authentication
  app.use('/uploads', cors({ origin: corsOriginCheck, credentials: true }), authenticate, express.static(uploadsDir))

  app.use(cors({ origin: corsOriginCheck, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  // Database Health Check (queda en app.js por ser nivel sistema)
  app.get('/health/db', async (req, res, next) => {
    if (config.nodeEnv !== 'development') {
      return res.status(404).json({ success: false, message: 'Endpoint not available' })
    }
    
    try {
      const { rows } = await pool.query('SELECT NOW() AS db_time')
      res.json({ ok: true, db: 'postgres', time: rows[0].db_time })
    } catch (error) {
      next(error)
    }
  })

  // Montar todas las rutas del API bajo el prefijo /api
  app.use('/api', apiRoutes)

  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' })
  })

  app.use(errorHandler)
  return app
}



//codigo Real, descomentar despues de hacer las pruebas

/**
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import helmet from 'helmet'
import { errorHandler } from './middlewares/error.middleware.js'
import { authenticate } from './middlewares/auth.middleware.js'
import { pool } from './config/database.js'
import { config } from './config/index.js'
import apiRoutes from './routes.js'

export function createApp () {
  const app = express()

  // Apply helmet for security headers. We disable CORP to allow our frontend to load images.
  app.use(helmet({ crossOriginResourcePolicy: false }))

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads')
  fs.mkdirSync(uploadsDir, { recursive: true })

  // Serve uploaded files statically with CORS and authentication
  app.use('/uploads', cors({ origin: config.frontendUrl === '*' ? true : config.frontendUrl, credentials: true }), authenticate, express.static(uploadsDir))

  app.use(cors({ origin: config.frontendUrl === '*' ? true : config.frontendUrl, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  // Database Health Check (queda en app.js por ser nivel sistema)
  app.get('/health/db', async (req, res, next) => {
    if (config.nodeEnv !== 'development') {
      return res.status(404).json({ success: false, message: 'Endpoint not available' })
    }
    
    try {
      const { rows } = await pool.query('SELECT NOW() AS db_time')
      res.json({ ok: true, db: 'postgres', time: rows[0].db_time })
    } catch (error) {
      next(error)
    }
  })

  // Montar todas las rutas del API bajo el prefijo /api
  app.use('/api', apiRoutes)

  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' })
  })

  app.use(errorHandler)
  return app
}
**/