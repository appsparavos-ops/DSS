import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './pwa/registerSW'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registrar el Service Worker con recuperación automática del caso
// "PWA huérfana tras migración de dispositivo" (falla "No se pudo abrir la app").
registerServiceWorker()
