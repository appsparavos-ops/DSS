const { app, BrowserWindow, ipcMain, dialog, powerSaveBlocker } = require('electron');
const path = require('path');
const fs = require('fs');

// Determinar si estamos en desarrollo o producción
const isDev = !app.isPackaged;

// ─── Carpeta de datos estándar de DSS ───────────────────────────────────────
// Todos los archivos de la app viven en Documentos/DSS:
//   partidos/    → *.dss (partidos guardados y autoguardado del partido en curso)
//   actas/       → *.pdf (actas generadas)
//   equipos/     → *.csv (planteles exportados)
//   plantillas/  → *.dss exportados desde la biblioteca
const DATA_DIR = path.join(app.getPath('documents'), 'DSS');
const DIRS = {
  partidos: path.join(DATA_DIR, 'partidos'),
  actas: path.join(DATA_DIR, 'actas'),
  equipos: path.join(DATA_DIR, 'equipos'),
  plantillas: path.join(DATA_DIR, 'plantillas'),
};

const ensureDataDirs = () => {
  for (const dir of [DATA_DIR, DIRS.partidos, DIRS.actas, DIRS.equipos, DIRS.plantillas]) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.error('No se pudo crear la carpeta de datos:', dir, e);
    }
  }
};

const sanitizeFileName = (name) => (name || 'archivo').replace(/[\\/:*?"<>|]/g, '_').slice(0, 150);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, 'icono.ico'),
    title: 'DSS - Digital Score Sheet',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
    show: false,
  });

  // Mostrar la ventana cuando esté lista para evitar flash blanco
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    // En desarrollo, cargar desde el servidor de Vite
    mainWindow.loadURL('http://localhost:5173');
    // Abrir DevTools automáticamente en desarrollo
    mainWindow.webContents.openDevTools();
  } else {
    // En producción, cargar el archivo compilado
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ─── Handlers de archivos ───────────────────────────────────────────────────

// Ruta de la carpeta de datos (para mostrar en la UI si se desea)
ipcMain.handle('get-data-dir', () => ({ success: true, path: DATA_DIR }));

// Guardar partido con diálogo (subfolder: 'partidos' | 'plantillas')
ipcMain.handle('save-match', async (event, gameData, fileName, subfolder = 'partidos') => {
  const dir = DIRS[subfolder] || DIRS.partidos;
  const { filePath } = await dialog.showSaveDialog({
    title: 'Guardar Partido',
    defaultPath: path.join(dir, `${sanitizeFileName(fileName)}.dss`),
    filters: [{ name: 'DSS Match Files', extensions: ['dss'] }]
  });

  if (filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2));
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, cancelled: true };
});

// Cargar partido con diálogo (abre por defecto en la carpeta de partidos)
ipcMain.handle('load-match', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Cargar Partido',
    defaultPath: DIRS.partidos,
    filters: [{ name: 'DSS Match Files', extensions: ['dss'] }],
    properties: ['openFile']
  });

  if (!canceled && filePaths.length > 0) {
    try {
      const data = fs.readFileSync(filePaths[0], 'utf8');
      return { success: true, data: JSON.parse(data) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, cancelled: true };
});

// Autoguardado silencioso del partido en curso (backup local anti-crash)
ipcMain.handle('autosave-match', (event, fileName, gameData) => {
  try {
    const filePath = path.join(DIRS.partidos, `${sanitizeFileName(fileName)}.dss`);
    fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2));
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Guardar acta PDF en la carpeta "actas/"
ipcMain.handle('save-pdf', (event, fileName, arrayBuffer) => {
  try {
    const filePath = path.join(DIRS.actas, sanitizeFileName(fileName));
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Guardar CSV de equipo en la carpeta "equipos/"
ipcMain.handle('save-csv', (event, fileName, content) => {
  try {
    const filePath = path.join(DIRS.equipos, sanitizeFileName(fileName));
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Cuando Electron esté listo, crear la ventana
app.whenReady().then(() => {
  ensureDataDirs();
  createWindow();

  // ─── Anti-apagado / anti-hibernación ─────────────────────────────────────
  // Mientras la app esté abierta la pantalla no se apaga y el sistema no
  // entra en suspensión ni hibernación (crítico durante un partido).
  // El bloqueo se libera solo al cerrar la app.
  try {
    const wakeLockId = powerSaveBlocker.start('prevent-display-sleep');
    app.on('before-quit', () => {
      try {
        if (powerSaveBlocker.isStarted(wakeLockId)) {
          powerSaveBlocker.stop(wakeLockId);
        }
      } catch (e) { /* ya liberado */ }
    });
  } catch (e) {
    console.error('No se pudo activar el bloqueo de ahorro de energía:', e);
  }

  app.on('activate', () => {
    // En macOS, re-crear ventana al hacer clic en el dock si no hay ventanas
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Cerrar la app cuando todas las ventanas se cierren (excepto en macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
