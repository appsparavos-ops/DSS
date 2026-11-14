import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/teamCsv.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`;
const { parseTeamCsvLine } = await import(moduleUrl);

test('mantiene vacía la licencia y lee número y nombre de las columnas B y C', () => {
  assert.deepEqual(parseTeamCsvLine(';4;VALENTÍN'), { license: '', number: '4', name: 'VALENTÍN' });
  assert.deepEqual(parseTeamCsvLine(' ; 00 ; ANA MUÑOZ '), { license: '', number: '00', name: 'ANA MUÑOZ' });
  assert.deepEqual(parseTeamCsvLine(';4;VALENTÍN;'), { license: '', number: '4', name: 'VALENTÍN' });
});

test('acepta número y nombre sin columna de licencia', () => {
  assert.deepEqual(parseTeamCsvLine('4;VALENTÍN'), { license: '', number: '4', name: 'VALENTÍN' });
});

test('reconoce número y nombre cuando faltó el primer separador pero sobran separadores finales', () => {
  assert.deepEqual(parseTeamCsvLine('4;VALENTÍN;'), { license: '', number: '4', name: 'VALENTÍN' });
  assert.deepEqual(parseTeamCsvLine('00;ANA MUÑOZ;;;'), { license: '', number: '00', name: 'ANA MUÑOZ' });
  assert.deepEqual(parseTeamCsvLine(' 99 ; GONZÁLEZ PÉREZ ; ;'), { license: '', number: '99', name: 'GONZÁLEZ PÉREZ' });
});

test('conserva las tres columnas cuando sí hay una licencia', () => {
  assert.deepEqual(parseTeamCsvLine('00123456;4;VALENTÍN'), { license: '00123456', number: '4', name: 'VALENTÍN' });
  assert.deepEqual(parseTeamCsvLine('LIC-A;04;ANA;'), { license: 'LIC-A', number: '04', name: 'ANA' });
});

test('no cambia columnas de filas incompletas con número de camiseta numérico', () => {
  assert.deepEqual(parseTeamCsvLine('12345678;4;'), { license: '12345678', number: '4', name: '' });
  assert.deepEqual(parseTeamCsvLine('4;99;'), { license: '4', number: '99', name: '' });
  assert.deepEqual(parseTeamCsvLine(';4;'), { license: '', number: '4', name: '' });
});

test('una columna se interpreta como nombre, como en versiones anteriores', () => {
  assert.deepEqual(parseTeamCsvLine('VALENTÍN'), { license: '', number: '', name: 'VALENTÍN' });
});
