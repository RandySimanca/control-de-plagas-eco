import { createApp } from './app.js'
import { config } from './config/index.js'

const app = createApp()

app.listen(config.port, () => {
  console.log(`PlagControl API escuchando en http://localhost:${config.port}`)
  console.log(`Health: GET http://localhost:${config.port}/health`)
  console.log(`DB Health: GET http://localhost:${config.port}/health/db`)
})
