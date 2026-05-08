import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function runMigrations() {
  console.log('🚀 Iniciando migraciones de base de datos...')
  
  try {
    // 1. Asegurar que existe la tabla de control de migraciones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // 2. Leer archivos de la carpeta migrations
    const migrationsDir = path.join(__dirname, 'migrations')
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

    for (const file of files) {
      // Verificar si ya fue ejecutada
      const { rows } = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [file])
      
      if (rows.length === 0) {
        console.log(`  📄 Ejecutando migración: ${file}`)
        const filePath = path.join(migrationsDir, file)
        const sql = fs.readFileSync(filePath, 'utf8')
        
        // Ejecutar el SQL de la migración
        await pool.query(sql)
        
        // Registrar ejecución
        await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
      }
    }

    console.log('✅ Migraciones completadas con éxito.')
  } catch (error) {
    console.error('❌ Error durante las migraciones:', error)
    throw error
  }
}
