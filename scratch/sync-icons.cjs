const fs = require('fs');
const path = require('path');

const source = 'icono.ico';
const targets = [
  'icon.ico',
  'build/icon.ico',
  'electron/icon.ico',
  'electron/icono.ico',
  'public/favicon.ico',
  'public/icono.ico'
];

if (!fs.existsSync(source)) {
  console.error('No se encuentra icono.ico en la raíz');
  process.exit(1);
}

const sourceData = fs.readFileSync(source);
console.log(`Cargado icono original (${sourceData.length} bytes)`);

targets.forEach(target => {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(target, sourceData);
  console.log(`Actualizado: ${target}`);
});

// Borrar archivos PNG antiguos que podrían estar interfiriendo
const toDelete = [
  'build/icon.png',
  'build/file-icon.png'
];

toDelete.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Eliminado archivo antiguo: ${file}`);
  }
});
