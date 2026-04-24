const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveMatch: (gameData, fileName) => ipcRenderer.invoke('save-match', gameData, fileName),
  loadMatch: () => ipcRenderer.invoke('load-match'),
});
