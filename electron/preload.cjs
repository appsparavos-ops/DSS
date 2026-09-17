const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Partidos
  saveMatch: (gameData, fileName, subfolder) => ipcRenderer.invoke('save-match', gameData, fileName, subfolder),
  loadMatch: () => ipcRenderer.invoke('load-match'),
  autosaveMatch: (fileName, gameData) => ipcRenderer.invoke('autosave-match', fileName, gameData),
  // Actas PDF
  savePdf: (fileName, arrayBuffer) => ipcRenderer.invoke('save-pdf', fileName, arrayBuffer),
  // CSV de equipos
  saveCsv: (fileName, content) => ipcRenderer.invoke('save-csv', fileName, content),
  // Info
  getDataDir: () => ipcRenderer.invoke('get-data-dir'),
});
