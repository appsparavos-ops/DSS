import { registerSW } from 'virtual:pwa-register'

/**
 * Registro robusto del Service Worker:
 *  - Detecta si la PWA se abrió desde el atajo instalado pero sin SW activo
 *    (cuadro de "migración de tablet" → "No se pudo abrir la app") y lo
 *    autoregistra+recupera.
 *  - No bloquea si el navegador no soporta SW (p.ej. modo incógnito).
 *  - Aplica actualizaciones con confirmación.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  // Detectar si la app se abrió desde el atajo PWA instalado
  const launchedFromPwaShortcut =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true

  let orphanedPwaDetected = false

  const updateSW = registerSW({
    immediate: false,
    onNeedRefresh() {
      try {
        const ok = window.confirm(
          'Hay una nueva versión de DSS disponible.\n' +
          '¿Recargar para actualizar ahora?'
        )
        if (ok) updateSW(true)
      } catch {
        updateSW(true)
      }
    },
    onOfflineReady() {
      console.log('[DSS/PWA] Lista para usarse sin conexión')
    },
    onRegisteredSW(swUrl, registration) {
      if (!registration) {
        console.warn('[DSS/PWA] No se pudo registrar el SW:', swUrl)
        return
      }
      console.log('[DSS/PWA] Service Worker registrado:', swUrl, registration.scope)

      if (orphanedPwaDetected) {
        // Esperar a que el SW nuevo se active y entonces recargar para que el
        // shell precacheado se sirva desde el SW.
        const done = registration.active?.state === 'activated'
          ? Promise.resolve()
          : new Promise<void>(resolve => {
              const sw = registration.installing || registration.waiting
              if (sw) {
                sw.addEventListener('statechange', () => {
                  if (sw.state === 'activated') resolve()
                })
              }
              setTimeout(resolve, 3500)
            })
        done.then(() => window.location.reload())
      }
    },
    onRegisterError(error) {
      console.error('[DSS/PWA] Error al registrar Service Worker:', error)
    }
  })

  if (launchedFromPwaShortcut) {
    // Verificar si hay un SW controlando esta página. Si no, registro y recargo.
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg || !reg.active) {
        orphanedPwaDetected = true
        console.warn('[DSS/PWA] PWA sin SW activo (posible migración). Registrando…')
        updateSW()
      }
    })
  } else {
    // En el navegador normal: registrar/actualizar sin pedir permiso.
    updateSW()
  }
}
