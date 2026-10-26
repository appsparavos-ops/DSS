import { registerSW } from 'virtual:pwa-register'

/**
 * Registro robusto del Service Worker pensado para sobrevivir:
 *  - Migración de dispositivo (Chrome Android restaura el registro de PWA
 *    instalada pero NO el SW/cache → la app aparece "instalada" pero al
 *    abrirla falla con "No se pudo abrir la app").
 *  - Navegador en modo privado / SW no soportado (fallback silencioso).
 *  - Actualizaciones silenciosas (auto-apply) con confirmación si hay
 *    una nueva versión lista mientras la app está abierta.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  // Detectar apertura desde el atajo PWA
  const url = new URL(window.location.href)
  const launchedFromPwaShortcut =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true ||
    url.searchParams.has('pwa')

  // Intentar detectar la situación "PWA huérfana": abierta desde el atajo
  // pero sin SW registrado para este origen. Dispara una recarga tras
  // registrar el SW para que el shell esté disponible.
  let orphanedPwaDetected = false

  const updateSW = registerSW({
    immediate: false,
    onNeedRefresh() {
      // Se descargó una nueva versión de la app
      try {
        const reload = window.confirm(
          'Hay una nueva versión de DSS disponible.\n' +
          '¿Recargar para actualizar ahora?'
        )
        if (reload) updateSW(true)
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
        // Le damos un instante para que el SW se instale y precachee el shell
        // antes de recargar la app desde el atajo.
        const whenActivated =
          registration.active?.state === 'activated'
            ? Promise.resolve()
            : new Promise<void>(resolve => {
                registration.addEventListener?.('updatefound', () => {
                  const newSW = registration.installing
                  newSW?.addEventListener('statechange', () => {
                    if (newSW.state === 'activated') resolve()
                  })
                })
                // Si nunca llega a activated (p. ej. ya estaba en installing),
                // forzamos el reload tras un timeout de seguridad.
                setTimeout(resolve, 3000)
              })
        whenActivated.then(() => window.location.reload())
      }
    },
    onRegisterError(error) {
      console.error('[DSS/PWA] Error al registrar Service Worker:', error)
    }
  })

  if (launchedFromPwaShortcut) {
    // Verificar si hay un SW controlando esta página. Si no, estamos ante el
    // caso de PWA huérfana/migrada: registramos y luego recargamos.
    navigator.serviceWorker.getRegistration().then(reg => {
      const hasActiveSw = !!reg && !!reg.active
      if (!hasActiveSw) {
        orphanedPwaDetected = true
        console.warn(
          '[DSS/PWA] PWA abierta pero sin SW activo (posible migración).'
        )
        updateSW()
      }
    })
    // Limpiar el flag ?pwa=1 de la URL sin re-navegar (evita loops y deja la
    // URL limpia tras el primer arranque).
    if (url.searchParams.has('pwa')) {
      url.searchParams.delete('pwa')
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    }
  } else {
    // Navegador normal: registrar/actualizar el SW en segundo plano.
    updateSW()
  }
}
