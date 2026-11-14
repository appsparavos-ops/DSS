import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Firebase sustituido por un almacén en memoria: no requiere red ni escribe
// datos de prueba en el proyecto remoto.
const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const appStub = asModule('export const initializeApp = config => ({ config });');
const firestoreStub = asModule(`
  export const initializeFirestore = (app, options) => ({ app, options });
  export const persistentSingleTabManager = () => ({});
  export const persistentLocalCache = options => options;
  export const doc = (db, collection, code) => ({ db, collection, code });
  export const serverTimestamp = () => ({ serverTimestamp: true });
  export const setDoc = async (reference, data) => { globalThis.__dssSyncTest = { reference, data }; };
  export const getDoc = async () => ({ exists: () => !!globalThis.__dssSyncTest, data: () => globalThis.__dssSyncTest.data });
  export const onSnapshot = () => () => {};
`);
const source = await readFile(new URL('../src/services/sync.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText
  .replaceAll("'firebase/app'", `'${appStub}'`)
  .replaceAll("'firebase/firestore'", `'${firestoreStub}'`);
const sync = await import(asModule(js));

test('el backup conserva el formato, el bloqueo y las faltas de los seis períodos', async () => {
  const state = {
    matchFormat: '6x7', hasStarted: true, status: 'PLAYING', period: 6, timer: 342,
    competition: 'PRUEBA',
    teamA: { name: 'A', foulsPerPeriod: [4, 0, 1, 2, 3, 4], hcc: undefined, players: [{ name: 'ANA', entryPeriod: undefined }] },
    teamB: { name: 'B', foulsPerPeriod: [1, 0, 0, 0, 0, 2], logo: undefined, players: [] },
  };
  await sync.pushMatch('PRUEBA', state);
  const sent = globalThis.__dssSyncTest.data.state;
  assert.equal(sent.matchFormat, '6x7');
  assert.equal(sent.hasStarted, true);
  assert.deepEqual(sent.teamA.foulsPerPeriod, [4, 0, 1, 2, 3, 4]);
  assert.equal('hcc' in sent.teamA, false);
  assert.equal('entryPeriod' in sent.teamA.players[0], false);
  assert.equal('logo' in sent.teamB, false);
  const recovered = await sync.pullMatch('PRUEBA');
  assert.deepEqual(recovered, sent);
  assert.equal(recovered.period, 6);
  delete globalThis.__dssSyncTest;
});
