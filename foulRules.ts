import type { PlayerFoul, PlayerFoulPenalty, PlayerFoulSelection, PlayerFoulType } from '../types';

type NormalizedPlayerFoulType = 'P' | 'T' | 'T_DELAY' | 'T_DISQUALIFYING' | 'DI' | 'FL' | 'D';

export interface NormalizedPlayerFoul {
  type: NormalizedPlayerFoulType;
  penalty?: PlayerFoulPenalty;
  label: string;
  circled: boolean;
  countsForSpecialDisqualification: boolean;
}

const legacyPenaltyByType: Partial<Record<PlayerFoulType, PlayerFoulPenalty>> = {
  P1: '1',
  P2: '2',
  P3: '3',
  T1: '1',
  U2: '2',
};

export const normalizePlayerFoul = (
  foul: PlayerFoul | PlayerFoulSelection | PlayerFoulType
): NormalizedPlayerFoul => {
  const foulType = typeof foul === 'string' ? foul : foul.type;
  const explicitPenalty = typeof foul === 'string' ? undefined : foul.penalty;
  const penalty = explicitPenalty || legacyPenaltyByType[foulType];

  if (foulType === 'D') {
    return { type: 'D', label: 'D', circled: false, countsForSpecialDisqualification: true };
  }

  if (foulType === 'T1' || foulType === 'T_DISQUALIFYING') {
    return { type: 'T_DISQUALIFYING', penalty, label: 'T', circled: true, countsForSpecialDisqualification: true };
  }

  // FIBA 2026: Técnica por demora (Categoría 2). Cuenta como falta personal y de equipo,
  // pero NO acumula para la descalificación. En el acta se anota como "T" sin círculo.
  if (foulType === 'T_DELAY') {
    return { type: 'T_DELAY', penalty, label: 'T', circled: false, countsForSpecialDisqualification: false };
  }

  if (foulType === 'U2' || foulType === 'FL') {
    return { type: 'FL', penalty, label: 'FL', circled: true, countsForSpecialDisqualification: true };
  }

  if (foulType === 'DI') {
    return { type: 'DI', penalty, label: 'DI', circled: false, countsForSpecialDisqualification: false };
  }

  // FIBA 2026: la Técnica (Categoría 1) por conducta cuenta para la descalificación
  // y se anota en el acta como "T" dentro de un círculo.
  if (foulType === 'T') {
    return { type: 'T', penalty, label: 'T', circled: true, countsForSpecialDisqualification: true };
  }

  return { type: 'P', penalty, label: 'P', circled: false, countsForSpecialDisqualification: false };
};

export const createPlayerFoul = (
  selection: PlayerFoulType | PlayerFoulSelection,
  period: number
): PlayerFoul => {
  const normalized = normalizePlayerFoul(selection);
  return {
    type: normalized.type === 'T_DISQUALIFYING' ? 'T_DISQUALIFYING' : normalized.type,
    period,
    ...(normalized.penalty ? { penalty: normalized.penalty } : {}),
  };
};

export const formatPlayerFoul = (foul: PlayerFoul | PlayerFoulSelection | PlayerFoulType): string => {
  const normalized = normalizePlayerFoul(foul);
  if (normalized.type === 'D') return 'D';
  const suffix = normalized.penalty || '';
  return normalized.circled ? `(${normalized.label})${suffix}` : `${normalized.label}${suffix}`;
};

// FIBA 2026: descalificación por 2 Técnicas Cat.1, 2 Flagrantes (FL), o 1 de cada una.
// Las Técnicas por demora (T_DELAY) y las Disruptivas (DI) NO acumulan para GD,
// aunque sí cuentan como faltas personales y de equipo.
export const isPlayerDisqualifiedByFouls = (fouls: PlayerFoul[]): boolean => {
  if (fouls.length >= 5) return true;
  if (fouls.some(f => normalizePlayerFoul(f).type === 'D')) return true;
  return isSpecialDisqualification(fouls);
};

export const isSpecialDisqualification = (fouls: PlayerFoul[]): boolean => {
  if (fouls.some(f => normalizePlayerFoul(f).type === 'D')) return true;

  const countingT = fouls.filter(f => {
    const n = normalizePlayerFoul(f);
    return n.type === 'T' || n.type === 'T_DISQUALIFYING';
  }).length;
  const flagrantU = fouls.filter(f => normalizePlayerFoul(f).type === 'FL').length;

  return countingT >= 2 || flagrantU >= 2 || (countingT >= 1 && flagrantU >= 1);
};
