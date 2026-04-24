const { MSICreator } = require('electron-wix-msi');
const path = require('path');

const msiCreator = new MSICreator({
  appDirectory: path.resolve(__dirname, './release/win-unpacked'),
  description: 'Digital Score Sheet - Sistema de Acta Digital de Baloncesto',
  exe: 'DSS',
  name: 'DSS',
  manufacturer: 'Arturo',
  version: '1.0.0',
  upgradeCode: '63ec1517-f703-47b3-861e-1fe96a2b3451',
  outputDirectory: path.resolve(__dirname, './release/msi'),
  language: 1034,
  cultures: 'es-es',
  icon: path.resolve(__dirname, './icon.ico'),
  fileAssociations: [
    {
      extension: 'dss',
      description: 'Digital Score Sheet Match Data',
      icon: path.resolve(__dirname, './build/file-icon.png')
    }
  ],
  shortcutName: 'DSS',
  programMenuCategory: 'DSS Score Sheet',
  ui: {
    chooseDirectory: true
  }
});

async function createMSI() {
  try {
    console.log('Creando instalador MSI...');
    await msiCreator.create();
    console.log('Compilando instalador MSI...');
    await msiCreator.compile();
    console.log('¡Instalador MSI creado con éxito en release/msi!');
  } catch (error) {
    console.error('Error al crear el MSI:', error);
    process.exit(1);
  }
}

createMSI();
