import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// ── Base path ────────────────────────────────────────────────────────────────
// GitHub Pages sirve la app en un subpath:  https://<user>.github.io/DSS/
// Electron y npm run dev/preview usan la raíz ('./').  El workflow de CI
// (deploy.yml) setea BASE_PATH=/DSS/  automáticamente usando el nombre del repo.
const base = process.env.BASE_PATH ?? './'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false, // registro manual en src/pwa/registerSW.ts
      strategies: 'generateSW',
      useCredentials: false,
      includeAssets: ['favicon.ico', 'favicon.svg', 'icono.ico', 'icons.svg'],
      manifest: {
        name: 'FIBA Digital Score Sheet',
        short_name: 'DSS',
        description: 'Planilla de Juego Digital Oficial para Baloncesto',
        lang: 'es',
        theme_color: '#1a237e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'landscape',
        // Rutas relativas al manifest → funcionan tanto en subpath como en raíz.
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
  preview: { allowedHosts: true },
  server: { allowedHosts: true }
})
