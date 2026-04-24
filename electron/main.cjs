const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Determinar si estamos en desarrollo o producción
const isDev = !app.isPackaged;

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

// Handlers para Guardar/Cargar Partidos
ipcMain.handle('save-match', async (event, gameData, fileName) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Guardar Partido',
    defaultPath: path.join(app.getPath('documents'), `${fileName || 'partido'}.dss`),
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

ipcMain.handle('load-match', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Cargar Partido',
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

// Cuando Electron esté listo, crear la ventana
app.whenReady().then(() => {
  createWindow();

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

