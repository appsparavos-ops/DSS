# DSS — FIBA Digital Score Sheet

Planilla de Juego Digital Oficial para Baloncesto. PWA instalable y offline-first
con soporte opcional para escritorio (Electron). El deploy está configurado para
**GitHub Pages** mediante GitHub Actions (`.github/workflows/deploy.yml`).

## Despliegue en GitHub Pages (automático)

1. Sube el código a la rama `main` del repo `DSS`.
2. En GitHub → **Settings** → **Pages** → *Source* selecciona
   **"GitHub Actions"** (no "Deploy from a branch").
3. Al hacer push a `main`, el workflow automáticamente:
   - Instala dependencias
   - Compila con `BASE_PATH=/<nombre-del-repo>/` (queda bien así renombraras el repo)
   - Genera `404.html` (SPA fallback para rutas profundas en Pages)
   - Incluye `.nojekyll` (desactiva Jekyll para servir los assets tal cual)
   - Publica el contenido de `dist/` en Pages.

URL final: `https://<tu-usuario>.github.io/DSS/`

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # build producción en dist/
npm test             # pruebas de importación CSV
npm run preview      # preview de la build
```

## Importar jugadores desde CSV

En la preparación del partido, usa **IMPORTAR CSV** en cada equipo. El archivo
lleva una línea por jugador, sin encabezados y con punto y coma como separador:

```csv
12345678;4;VALENTÍN PÉREZ
;5;ANA MUÑOZ
```

Las columnas son licencia o DNI, número de camiseta y nombre; la licencia puede
quedar vacía. En ese caso, conserva el primer punto y coma (por ejemplo,
`;5;ANA MUÑOZ`). También se admite `5;ANA MUÑOZ` sin columna de DNI y, cuando
el primer valor es un número de camiseta de uno o dos dígitos, esa misma forma
con separadores vacíos adicionales al final.

Se leen UTF-8 (con o sin BOM), ANSI/Windows-1252 y UTF-16 con BOM. La
exportación genera UTF-8 con BOM para que Excel reconozca las tildes.

Se importan como máximo 40 jugadores por equipo, sin selección previa: hay que
marcar manualmente hasta 12 para el roster. Al importar, se reemplaza la lista
de jugadores de ese equipo. Si el archivo original ya contiene `�`, la letra
perdida no se puede recuperar automáticamente: vuelve a exportarlo desde los
datos originales o corrige el nombre manualmente.

## Diagnóstico de instalación PWA

Si Chrome dice *"No se puede instalar esta app"*, abre en la tablet
(desde el mismo dominio donde está desplegada DSS):

```
https://<tu-usuario>.github.io/DSS/pwa-diagnostic.html
```

Te muestra en verde/rojo qué requisito de PWA falla (HTTPS, manifest, iconos, SW, etc.).

## Instalar como PWA (Android / Chrome de escritorio)

1. Abre la app con conexión.
2. Menú ⋮ → **"Instalar aplicación"**.
3. La primera vez ábrela con conexión para que se precachee. Luego funciona offline.

## Si en una tablet nueva dice "La app ya está instalada" / "No se pudo abrir"

Es el caso de PWA huérfana por restauración desde la cuenta Google:
1. Mantén el icono → *Desinstalar*.
2. `chrome://settings/siteData` → busca tu dominio → Borrar.
3. Cierra Chrome completamente (recientes → quitar).
4. Abre DSS en Chrome y vuelve a instalar.

El SW ya tiene lógica de auto-recuperación: si detecta que se abrió el atajo sin
SW activo, lo registra y recarga la app.

## Empaquetado para Windows (Electron)

```bash
npm run electron:build            # instalador NSIS (.exe)
npm run electron:build:portable   # versión portable
node create-msi.cjs               # instalador MSI (requiere release/win-unpacked)
```
