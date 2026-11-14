import type { CoachFoul, GameEvent, GameState, PlayerFoulType, Team } from '../types';
import { getElapsedMinuteFromClock, getRegulationPeriods, getTeamFoulIndex } from './matchRules';

/** Reconstruye el marcador cuando se modifica o elimina un evento del historial. */
export const rebuildGameFromHistory = (state: GameState, history: GameEvent[]): GameState => {
  const cleanTeam = (team: Team): Team => ({
    ...team,
    headCoachFouls: [],
    assistantCoachFouls: [],
    score: 0,
    foulsPerPeriod: Array.from({ length: getRegulationPeriods(state.matchFormat) }, () => 0),
    timeouts: [],
    hcc: undefined,
    players: team.players.map(p => ({ ...p, points: 0, fouls: [] })),
  });

  const teamA = cleanTeam(state.teamA);
  const teamB = cleanTeam(state.teamB);
  let possessionArrow: 'A' | 'B' | null = null;

  // El historial está guardado del evento más reciente al más antiguo.
  [...history].reverse().forEach(event => {
    const team = event.teamSide === 'A' ? teamA : teamB;
    if (event.type.startsWith('POINT')) {
      const points = event.type === 'POINT1' ? 1 : event.type === 'POINT2' ? 2 : 3;
      team.score += points;
      const player = team.players.find(p => p.id === event.playerId);
      if (player) player.points += points;
    } else if (event.type === 'FOUL') {
      if (event.playerId === 'HC' || event.playerId === 'AC') {
        const fouls = event.playerId === 'AC' ? team.assistantCoachFouls : team.headCoachFouls;
        fouls.push(event.subType as CoachFoul);
      } else if (event.playerId) {
        const player = team.players.find(p => p.id === event.playerId);
        if (player) player.fouls.push({
          type: event.subType as PlayerFoulType,
          period: event.period,
          ...(event.foulPenalty ? { penalty: event.foulPenalty } : {}),
        });
        const index = getTeamFoulIndex(state.matchFormat, event.period);
        team.foulsPerPeriod[index] += 1;
      }
    } else if (event.type === 'TIMEOUT') {
      team.timeouts.push({
        period: event.period,
        minute: getElapsedMinuteFromClock(state.matchFormat, event.period, event.timeRemaining),
      });
    } else if (event.type === 'HCC') {
      team.hcc = {
        period: event.period,
        minute: getElapsedMinuteFromClock(state.matchFormat, event.period, event.timeRemaining),
      };
    } else if (event.type === 'POSSESSION') {
      possessionArrow = event.teamSide;
    }
  });

  return { ...state, teamA, teamB, history, possessionArrow };
};
