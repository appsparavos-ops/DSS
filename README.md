# DSS — FIBA Digital Score Sheet

Planilla de Juego Digital Oficial para Baloncesto. PWA instalable y offline-first
con soporte opcional para escritorio (Electron).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build producción en dist/
npm run preview    # preview de la build
```

## Instalar como PWA (Android/Chrome)

1. Servir la app por **HTTPS** o desde `localhost` (el Service Worker
   requiere un origen seguro).
2. Abrir la URL en Chrome → menú ⋮ → **"Instalar aplicación"** (o botón en la
   barra de direcciones).

### Solución: "La app ya está instalada" / "No se pudo abrir la app"

Esto pasa típicamente al migrar a una tablet nueva usando la restauración de
Google: Chrome restaura el **registro** de que la PWA está instalada, pero
**NO transfiere el Service Worker ni el cache**. El atajo existe pero no hay
quien responda cuando se intenta abrir.

Pasos para reparar la instalación rota en la tablet nueva:

1. **Desinstalar el atajo viejo**: Mantén presionado el icono de DSS en el
   launcher → "Desinstalar" o "Eliminar acceso directo".
2. **Limpiar datos del sitio** en Chrome:
   - Abre Chrome → ⚙️ Configuración → Privacidad → **Borrar datos de navegación**
   - En *"Avanzado"* marca **"Datos de sitios web"** (rango "Todos los periodos")
   - Borra.
   - Alternativa rápida: en la barra escribe `chrome://settings/siteData`,
     busca el dominio donde está hosteado DSS y borra todos sus datos.
3. **Cerrar Chrome completamente** (botón recientes → quitar la app).
4. **Volver a abrir el enlace a DSS** en Chrome y pulsar **"Instalar"**.
5. Abre DSS **desde el nuevo icono** una vez con conexión a internet para que
   se complete la instalación del Service Worker y el precacheo. A partir de
   ese momento funciona 100% offline.

La versión actual del código registra el SW con recuperación automática: si
detecta que la PWA se abrió desde el atajo sin SW activo (el caso de la
migración), lo registra y recarga automáticamente.
