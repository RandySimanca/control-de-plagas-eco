import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Registro automático del Service Worker para la PWA
registerSW({ 
  immediate: true,
  onRegistered(r) {
    console.log('PWA: Service Worker registrado con éxito', r)
  },
  onRegisterError(error) {
    console.error('PWA: Error al registrar el Service Worker', error)
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
