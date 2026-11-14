import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Cargar la función TypeScript real sin agregar un framework de pruebas.
const source = await readFile(new URL('../src/utils/csvEncoding.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`;
const { decodeCsvText } = await import(moduleUrl);
const decode = bytes => decodeCsvText(Uint8Array.from(bytes).buffer);

test('lee UTF-8 sin perder tildes, eñes ni otros caracteres', () => {
  const text = '001;4;VALENTÍN PEÑA\n002;5;JOSÉ MUÑOZ 李';
  assert.equal(decode(Buffer.from(text, 'utf8')), text);
});

test('descarta el BOM de UTF-8', () => {
  const text = '001;4;VALENTÍN';
  assert.equal(decode(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')])), text);
});

test('lee Windows-1252 cuando el CSV no es UTF-8 válido', () => {
  const text = '001;4;VALENTÍN PEÑA\n002;5;JOSÉ MUÑOZ';
  assert.equal(decode(Buffer.from(text, 'latin1')), text);
});

test('lee UTF-16 little endian con BOM', () => {
  const text = '001;4;VALENTÍN PEÑA';
  assert.equal(decode(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')])), text);
});

test('lee UTF-16 big endian con BOM', () => {
  const text = '001;4;VALENTÍN PEÑA';
  const bigEndian = Buffer.from(text, 'utf16le').swap16();
  assert.equal(decode(Buffer.concat([Buffer.from([0xfe, 0xff]), bigEndian])), text);
});

test('no inventa letras cuando el archivo ya contiene el símbolo de reemplazo', () => {
  const text = '001;4;VALENT�N';
  assert.equal(decode(Buffer.from(text, 'utf8')), text);
});

test('lee texto ASCII y archivos vacíos', () => {
  assert.equal(decode(Buffer.from('001;4;ANA', 'ascii')), '001;4;ANA');
  assert.equal(decode(Buffer.alloc(0)), '');
});
