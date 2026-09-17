// ─────────────────────────────────────────────────────────────────────────────
// Capa única de acceso al almacenamiento local (localStorage).
// Ningún componente/hook debe tocar localStorage directamente: todo pasa por
// acá, con claves versionadas para poder migrar esquemas a futuro.
// ─────────────────────────────────────────────────────────────────────────────

const VERSION = 'v2';

export const STORAGE_KEYS = {
  /** Estado del partido en curso (autoguardado) */
  gameState: `dss:${VERSION}:game-state`,
  /** Biblioteca de partidos guardados como plantillas */
  library: `dss:${VERSION}:library`,
  /** Catálogo de equipos (planteles reutilizables) */
  teamCatalog: `dss:${VERSION}:team-catalog`,
} as const;

const LEGACY_KEYS = {
  gameState: 'dss_game_state',
  library: 'dss_library',
} as const;

const safeRead = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const readJSON = <T,>(key: string): T | null => {
  const raw = safeRead(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const writeJSON = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error escribiendo en storage:', e);
  }
};

/**
 * Migración única desde las claves legacy (dss_game_state / dss_library):
 * si las claves nuevas están vacías y hay datos viejos, se copian.
 * Las claves legacy se conservan como copia de seguridad adicional.
 */
export const migrateLegacyStorage = (): void => {
  const pairs: [string, string][] = [
    [LEGACY_KEYS.gameState, STORAGE_KEYS.gameState],
    [LEGACY_KEYS.library, STORAGE_KEYS.library],
  ];
  for (const [legacyKey, newKey] of pairs) {
    if (safeRead(newKey) === null) {
      const legacy = safeRead(legacyKey);
      if (legacy !== null) {
        try {
          localStorage.setItem(newKey, legacy);
        } catch {
          /* noop */
        }
      }
    }
  }
};
