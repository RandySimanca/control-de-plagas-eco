import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

function requireEnv (name) {
  const v = process.env[name]
  if (!v) {
    throw new Error(`Falta variable de entorno obligatoria: ${name}`)
  }
  return v
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(url => url.trim())
    .filter(Boolean),
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d'
}


// codigo real, descomentar despues de hacer las pruebas
/**
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

function requireEnv (name) {
  const v = process.env[name]
  if (!v) {
    throw new Error(`Falta variable de entorno obligatoria: ${name}`)
  }
  return v
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  // IMPORTANTE: En producción DEBE configurarse FRONTEND_URL explícitamente.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d'
}**/
