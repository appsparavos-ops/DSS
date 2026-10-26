import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// NOTA: `base: './'` permite que la build funcione tanto servida desde la raíz
// de un dominio como desde subcarpeta y también cargada por Electron via file://.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // controlamos manualmente cuándo activar nuevas versiones
      injectRegister: false,  // registro manual en src/main.tsx
      strategies: 'generateSW',
      includeAssets: ['favicon.ico', 'favicon.svg', 'icono.ico', 'icons.svg'],
      manifest: {
        // ⚠️  El `id` es el identificador ÚNICO y ESTABLE de la PWA.
        // Debe ser una ruta absoluta al origen ('/') así Chrome no la confunde
        // aunque la app se sirva desde una subcarpeta o cambie el start_url.
        id: '/',
        name: 'FIBA Digital Score Sheet',
        short_name: 'DSS',
        description: 'Planilla de Juego Digital Oficial para Baloncesto',
        lang: 'es',
        theme_color: '#1a237e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'landscape',
        // start_url absoluto: evita ambigüedades con rutas relativas que en
        // algunos contextos (migración entre dispositivos, atajos antiguos)
        // resolvían a URLs inexistentes y disparaban "No se pudo abrir la app".
        // El parámetro `?pwa=1` permite detectar que se abrió desde el atajo
        // instalado y sirve de versión para invalidar accesos directos viejos.
        start_url: './index.html?pwa=1',
        scope: './',
        categories: ['sports', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Limpia caches precacheados de versiones antiguas automáticamente.
        cleanupOutdatedCaches: true,
        // El nuevo SW toma el control de todas las pestañas inmediatamente
        // tras activarse (evita "SW en espera" que puede dejar huérfana la
        // instalación en un dispositivo recién migrado).
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        // Cualquier navegación HTML cae al index.html (SPA shell) incluso
        // si el SW todavía no terminó de precachear en el primer arranque.
        navigateFallback: 'index.html',
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
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  base: './',
  preview: { allowedHosts: true },
  server: { allowedHosts: true }
})
