import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Registro del Service Worker con auto-actualización
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Hay una nueva versión lista: recargar para activarla
    if (confirm('Nueva versión disponible. ¿Recargar para actualizar?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('DSS está listo para usarse sin conexión')
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      console.log('Service Worker registrado:', swUrl)
    }
  },
  onRegisterError(error) {
    console.error('Error al registrar Service Worker:', error)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
