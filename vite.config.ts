import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' → funciona desde raíz de dominio, subcarpeta Y como app Electron
// (file://), evitando rutas absolutas que rompen cualquiera de esos escenarios.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' para controlar manualmente cuándo aplicar una nueva versión.
      registerType: 'prompt',
      injectRegister: false, // registro manual en src/pwa/registerSW.ts
      strategies: 'generateSW',
      // NO usar useCredentials: sería crossorigin="use-credentials", que
      // rompe la instalación si el hosting no responde con CORS+credentials.
      useCredentials: false,
      includeAssets: ['favicon.ico', 'favicon.svg', 'icono.ico', 'icons.svg'],
      manifest: {
        // Sin 'id' explícito: Chrome deriva el id desde start_url, que es
        // la forma más compatible (con base:'./' y start_url:'.' el scope
        // queda automáticamente en el directorio de la app).
        name: 'FIBA Digital Score Sheet',
        short_name: 'DSS',
        description: 'Planilla de Juego Digital Oficial para Baloncesto',
        lang: 'es',
        theme_color: '#1a237e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'landscape',
        // '.' significa "el mismo directorio que el manifest", que es
        // exactamente el shell de la app y está cubierto por el SW. Esto
        // funciona en raíz, subcarpeta y en instalaciones viejas/nuevas.
        start_url: '.',
        scope: './',
        categories: ['sports', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        // No interceptar API ni archivos estáticos reales como SPA nav.
        navigateFallbackDenylist: [/^\/api\//, /\.[a-zA-Z0-9]{2,5}$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: { enabled: true, type: 'module' }
    })
  ],
  base: './',
  preview: { allowedHosts: true },
  server: { allowedHosts: true }
})
