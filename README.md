# DSS — FIBA Digital Score Sheet

Planilla de Juego Digital Oficial para Baloncesto. Aplicación PWA (Progressive Web App)
instalable y usable sin conexión, con soporte opcional para empaquetado de escritorio con Electron.

## 🚀 Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # compilación de producción en dist/
npm run preview   # previsualizar la build de producción
```

## 📱 Instalar como PWA

1. Ejecuta `npm run build && npm run preview`.
2. Abre la URL en Chrome/Edge desde **HTTPS** o `localhost`.
3. En el navegador aparecerá el icono **"Instalar aplicación"** en la barra de direcciones.

La app funciona **offline** gracias al Service Worker generado por Workbox
(vite-plugin-pwa) y precachea todos los assets estáticos.

## 🖥️ Empaquetado para Windows (Electron)

```bash
npm run electron:build           # instalador NSIS (.exe)
npm run electron:build:portable  # versión portable
node create-msi.cjs              # generar instalador MSI (requiere release/win-unpacked)
```

## 🗂️ Estructura

```
src/
├── components/     # Componentes React (ActionPanel, Scoreboard, TeamTable, etc.)
├── hooks/          # Lógica de estado del partido (useGame, useWakeLock)
├── services/       # Almacenamiento local y sincronización (Firebase)
├── utils/          # Reglas de faltas y generación de PDF
├── App.tsx
├── main.tsx        # Registro del SW de la PWA
└── index.css
public/              # Íconos PWA y assets estáticos
electron/            # Código del escritorio (Electron)
```

## 🛠️ Correcciones aplicadas

- Se eliminaron archivos duplicados/obsoletos en la raíz (`ActionPanel.tsx`, `types.ts`,
  `foulRules.ts`, `pdfGenerator.ts` — copias desactualizadas).
- Se eliminaron carpetas generadas (`dev-dist/`, `scratch/`) y archivos de iconos
  repetidos (`icon.ico`, `public/icono.ico` redundantes).
- Se corrigió la compatibilidad de `vite-plugin-pwa` con Vite 8 (actualizado a v2.x).
- Se agregaron los iconos PWA requeridos: `pwa-192x192.png` y `pwa-512x512.png`
  (generados desde el ícono oficial).
- Se corrigió el `index.html`: `lang="es"`, rutas relativas, `theme-color`,
  `<link rel="manifest">`, `apple-touch-icon` y meta tags iOS/PWA faltantes.
- Se configuró correctamente el `manifest` (`start_url`, `scope`, `lang`,
  iconos con `purpose` separados `any`/`maskable`).
- Se mejoró el registro del Service Worker en `main.tsx` con manejo de
  actualizaciones (`onNeedRefresh`) y eventos `offlineReady`.
- Se agregó `navigateFallback` a Workbox para que funcione como SPA offline.
- Se agregó cache runtime para `fonts.gstatic.com`.
