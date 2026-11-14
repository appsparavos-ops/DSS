import type { GameState, MatchFormat, Team } from '../types';

/** Los partidos guardados antes de incorporar modalidades eran siempre 4 × 10. */
export const normalizeMatchFormat = (format: unknown): MatchFormat =>
  format === '6x7' ? '6x7' : '4x10';

export const getRegulationPeriods = (format?: MatchFormat): number =>
  normalizeMatchFormat(format) === '6x7' ? 6 : 4;

/** Duración del período en segundos; las prórrogas del formato 4 × 10 son de 5 min. */
export const getPeriodDuration = (format: MatchFormat | undefined, period: number): number => {
  if (normalizeMatchFormat(format) === '6x7') return 7 * 60;
  return period > 4 ? 5 * 60 : 10 * 60;
};

/** En 4 × 10, las faltas de la prórroga continúan acumulándose con el cuarto. */
export const getTeamFoulIndex = (format: MatchFormat | undefined, period: number): number =>
  Math.max(0, Math.min(period - 1, getRegulationPeriods(format) - 1));

export const allowsTimeouts = (format?: MatchFormat): boolean =>
  normalizeMatchFormat(format) === '4x10';

export const allowsOvertime = (format?: MatchFormat): boolean =>
  normalizeMatchFormat(format) === '4x10';

export const canFinishMatch = (state: Pick<GameState, 'matchFormat' | 'period' | 'teamA' | 'teamB'>): boolean =>
  state.period >= getRegulationPeriods(state.matchFormat) &&
  (!allowsOvertime(state.matchFormat) || state.teamA.score !== state.teamB.score);

export const getPeriodLabel = (format: MatchFormat | undefined, period: number): string => {
  if (normalizeMatchFormat(format) === '6x7') return `SEXTO ${period}`;
  if (period > 4) return `OT${period > 5 ? period - 4 : ''}`;
  return `PERIODO ${period}`;
};

export const getShortPeriodLabel = (format: MatchFormat | undefined, period: number): string => {
  if (normalizeMatchFormat(format) === '6x7') return `S${period}`;
  return period > 4 ? `OT${period - 4}` : `P${period}`;
};

/** En 6 sextos se alternan rojo y azul; en 4 cuartos se conserva el color de la prórroga. */
export const isRedPeriod = (format: MatchFormat | undefined, period: number): boolean =>
  normalizeMatchFormat(format) === '6x7' ? period <= 6 && period % 2 === 1 : period === 1 || period === 3;

/** Minuto transcurrido tal como lo registra el acta (al empezar vale 0). */
export const getElapsedMinute = (format: MatchFormat | undefined, period: number, secondsRemaining: number): number =>
  Math.max(0, Math.ceil(getPeriodDuration(format, period) / 60) - Math.floor(secondsRemaining / 60));

export const getElapsedMinuteFromClock = (format: MatchFormat | undefined, period: number, clock: string): number => {
  const [minutes, seconds] = clock.split(':').map(Number);
  return getElapsedMinute(format, period, (minutes || 0) * 60 + (seconds || 0));
};

/**
 * La marca explícita protege incluso un partido sin puntos que vuelve a SETUP.
 * Para archivos antiguos sin marca, se detectan las señales de juego conservadas.
 */
export const hasMatchStarted = (state: GameState): boolean => {
  const teamHasProgress = (team: Team) =>
    team.score > 0 || team.foulsPerPeriod.some(n => n > 0) || team.timeouts.length > 0 || !!team.hcc ||
    team.headCoachFouls.length > 0 || team.assistantCoachFouls.length > 0 ||
    team.players.some(p => p.hasEntered || p.points > 0 || p.fouls.length > 0);

  return state.hasStarted === true || state.status !== 'SETUP' || state.period > 1 ||
    (state.history?.length ?? 0) > 0 || state.isRunning ||
    state.timer !== getPeriodDuration(state.matchFormat, 1) ||
    teamHasProgress(state.teamA) || teamHasProgress(state.teamB);
};
