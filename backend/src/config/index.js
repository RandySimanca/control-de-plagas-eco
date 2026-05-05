import dotenv from 'dotenv'

dotenv.config()

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
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
}
