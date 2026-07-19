import { createApp } from './app.js'
import { config } from './config/index.js'
import { runMigrations } from './db/migrate.js'
import { runSeed } from './db/seed.js'

async function startServer() {
  try {
    // 1. Ejecutar migraciones antes de arrancar
    await runMigrations()

    // 2. Poblar datos iniciales (admin + demo) si aún no existen
    await runSeed()

    // 3. Iniciar la aplicación
    const app = createApp()

    app.listen(config.port, () => {
      console.log(`PlagControl API escuchando en http://localhost:${config.port}`)
      console.log(`Health: GET http://localhost:${config.port}/health`)
      console.log(`DB Health: GET http://localhost:${config.port}/health/db`)
    })
  } catch (error) {
    console.error('Fallo crítico al iniciar el servidor:', error)
    process.exit(1)
  }
}

startServer()
