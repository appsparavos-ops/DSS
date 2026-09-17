// ─────────────────────────────────────────────────────────────────────────────
// Backup online (Fase 2): sincronización del partido con Firestore.
// Modelo offline-first: los writes se encolan localmente sin conexión y se
// sincronizan cuando vuelve la red (persistencia en disco habilitada).
// ─────────────────────────────────────────────────────────────────────────────

import type { GameState } from '../types';

const firebaseConfig = {
  apiKey: 'AIzaSyDfTA2vZQDxHuVQ3VpNk2x3qkeWMsnHLao',
  authDomain: 'fibadss.firebaseapp.com',
  projectId: 'fibadss',
  storageBucket: 'fibadss.firebasestorage.app',
  messagingSenderId: '267229372860',
  appId: '1:267229372860:web:5f3ec64c06ad19d7ba0bb9',
};

export type SyncStatus = 'INACTIVE' | 'SYNCING' | 'SYNCED' | 'OFFLINE' | 'ERROR';

// Alfabeto sin caracteres confundibles (0/O, 1/I)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MATCH_CODE_LENGTH = 6;

export const generateMatchCode = (): string => {
  const bytes = new Uint32Array(MATCH_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
};

export const isValidMatchCode = (code: string): boolean =>
  /^[A-Z0-9]{4,10}$/.test(code.trim().toUpperCase());

// Inicialización perezosa de Firebase (solo se carga el SDK si se usa el backup)
let dbPromise: Promise<import('firebase/firestore').Firestore> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const { initializeApp } = await import('firebase/app');
      const {
        initializeFirestore,
        persistentLocalCache,
        persistentSingleTabManager,
      } = await import('firebase/firestore');
      const app = initializeApp(firebaseConfig);
      return initializeFirestore(app, {
        // Persistencia en disco: writes offline sobreviven recargas de página
        localCache: persistentLocalCache({
          tabManager: persistentSingleTabManager({}),
        }),
      });
    })();
  }
  return dbPromise;
};

/** Sube el estado completo del partido bajo su código (merge + timestamp de servidor). */
export const pushMatch = async (code: string, state: GameState): Promise<void> => {
  const db = await getDb();
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  await setDoc(
    doc(db, 'matches', code),
    {
      name: `${state.teamA.name} vs ${state.teamB.name}`,
      competition: state.competition,
      status: state.status,
      updatedAt: serverTimestamp(),
      state,
    },
    { merge: true }
  );
};

/** Descarga el estado del partido correspondiente al código (null si no existe). */
export const pullMatch = async (code: string): Promise<GameState | null> => {
  const db = await getDb();
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'matches', code));
  if (!snap.exists()) return null;
  const data = snap.data();
  return (data?.state as GameState) ?? null;
};

/** Suscripción en tiempo real al partido (para futuras segundas pantallas). */
export const subscribeMatch = async (
  code: string,
  onChange: (state: GameState | null) => void
): Promise<() => void> => {
  const db = await getDb();
  const { doc, onSnapshot } = await import('firebase/firestore');
  return onSnapshot(doc(db, 'matches', code), (snap) => {
    onChange(snap.exists() ? ((snap.data()?.state as GameState) ?? null) : null);
  });
};
