import pg from 'pg'
import { config } from './index.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
})

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL', err)
})
