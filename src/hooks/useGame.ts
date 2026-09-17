import { useState, useCallback, useEffect } from 'react';
import type {
  GameState,
  Team,
  Player,
  GameEvent,
  PlayerFoulType,
  PlayerFoulSelection,
  CoachFoul,
  CatalogTeam
} from '../types';
import { createPlayerFoul, formatPlayerFoul, isPlayerDisqualifiedByFouls } from '../utils/foulRules';
import { STORAGE_KEYS, readJSON, writeJSON, migrateLegacyStorage } from '../services/storage';
import { generateMatchCode, pushMatch, pullMatch, type SyncStatus } from '../services/sync';

const INITIAL_TIMER = 600; // 10 minutos por cuarto
export const MAX_PLAYERS = 20; // filas disponibles para cargar jugadores en el armado del partido
export const ROSTER_LIMIT = 12; // máximo de jugadores en el roster oficial (acta)

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getContrastColor = (hexcolor: string) => {
  if (!hexcolor || hexcolor === 'transparent' || !hexcolor.startsWith('#')) return '#000000';
  const hex = hexcolor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 2), 16);
  const b = parseInt(hex.substring(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
};

const createEmptyPlayer = (): Player => ({
  id: Math.random().toString(36).substr(2, 9),
  name: '',
  number: '',
  license: '',
  points: 0,
  fouls: [],
  isStarter: false,
  isCaptain: false,
  isInRoster: false,
  hasEntered: false,
});

// Migración al cargar estados guardados (solo en SETUP, para no alterar partidos en juego):
// - corrige jugadores vacíos que tenían isInRoster: true por el bug inicial
// - completa la plantilla hasta MAX_PLAYERS (los partidos viejos traían solo 12 filas)
const migrateGameState = (gs: GameState): GameState => {
  if (gs.status !== 'SETUP') return gs;
  const migrateTeam = (team: Team): Team => {
    const players = team.players.map(p =>
      (!p.name.trim() && !p.number.trim() && p.isInRoster)
        ? { ...p, isInRoster: false, isStarter: false, isCaptain: false }
        : p
    );
    while (players.length < MAX_PLAYERS) players.push(createEmptyPlayer());
    return { ...team, players };
  };
  return { ...gs, teamA: migrateTeam(gs.teamA), teamB: migrateTeam(gs.teamB) };
};

const createEmptyTeam = (name: string, color: string): Team => ({
  name,
  color,
  textColor: getContrastColor(color),
  headCoach: '',
  assistantCoach: '',
  headCoachFouls: [],
  assistantCoachFouls: [],
  players: Array.from({ length: MAX_PLAYERS }, createEmptyPlayer),
  score: 0,
  foulsPerPeriod: [0, 0, 0, 0],
  timeouts: [],
  hcc: undefined,
});

export const useGame = () => {
  const [state, setState] = useState<GameState>(() => {
    migrateLegacyStorage();
    const parsed = readJSON<GameState>(STORAGE_KEYS.gameState);
    if (parsed) {
      return migrateGameState({
        ...parsed,
        activeTimeout: null,
      });
    }
    return {
      teamA: createEmptyTeam('EQUIPO A', '#1a237e'),
      teamB: createEmptyTeam('EQUIPO B', '#b71c1c'),
      period: 1,
      timer: INITIAL_TIMER,
      isRunning: false,
      status: 'SETUP',
      history: [],
      competition: 'COMPETICIÓN OFICIAL',
      venue: 'SEDE CENTRAL',
      date: new Date().toLocaleDateString(),
      timeStart: '12:00',
      crewChief: '',
      umpire1: '',
      umpire2: '',
      scorer: '',
      timerOfficial: '',
      shotClockOperator: '',
      activeTimeout: null,
    };
  });

  const [savedGames, setSavedGames] = useState<{ id: string; name: string; date: string; data: GameState }[]>(() => {
    return readJSON<{ id: string; name: string; date: string; data: GameState }[]>(STORAGE_KEYS.library) ?? [];
  });

  const [savedTeams, setSavedTeams] = useState<CatalogTeam[]>(() => {
    return readJSON<CatalogTeam[]>(STORAGE_KEYS.teamCatalog) ?? [];
  });

  useEffect(() => {
    writeJSON(STORAGE_KEYS.gameState, state);
  }, [state]);

  useEffect(() => {
    writeJSON(STORAGE_KEYS.library, savedGames);
  }, [savedGames]);

  useEffect(() => {
    writeJSON(STORAGE_KEYS.teamCatalog, savedTeams);
  }, [savedTeams]);

  // Autoguardado local del partido en curso (solo en Electron): escribe
  // silenciosamente en la carpeta de datos "partidos/" con debounce.
  useEffect(() => {
    const win = window as any;
    if (!win.electronAPI?.autosaveMatch) return;
    const id = setTimeout(() => {
      const safe = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${safe(state.competition)}_${safe(state.teamA.name)}_${safe(state.teamB.name)}_${safe(state.date)}`;
      win.electronAPI.autosaveMatch(fileName, state).catch(() => { /* sin conexión/archivos: ignorar */ });
    }, 2000);
    return () => clearTimeout(id);
  }, [state]);

  // ─── Backup online (Firestore) ──────────────────────────────────────────
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(state.syncCode ? 'SYNCED' : 'INACTIVE');

  // Push automático con debounce cuando el partido tiene backup activo.
  // Sin conexión, el SDK encola los writes y sincroniza al volver la red.
  useEffect(() => {
    if (!state.syncCode) return;
    const id = setTimeout(() => {
      setSyncStatus('SYNCING');
      pushMatch(state.syncCode!, state)
        .then(() => setSyncStatus(navigator.onLine ? 'SYNCED' : 'OFFLINE'))
        .catch((e) => {
          console.error('Error de sincronización:', e);
          setSyncStatus('ERROR');
        });
    }, 4000);
    return () => clearTimeout(id);
  }, [state]);

  // Activa el backup (genera código si no existe) y sube el estado ya mismo.
  const activateBackup = useCallback(async (): Promise<string> => {
    const code = state.syncCode || generateMatchCode();
    setState(prev => ({ ...prev, syncCode: code }));
    setSyncStatus('SYNCING');
    try {
      await pushMatch(code, { ...state, syncCode: code });
      setSyncStatus(navigator.onLine ? 'SYNCED' : 'OFFLINE');
    } catch (e) {
      console.error('Error de sincronización:', e);
      setSyncStatus('ERROR');
    }
    return code;
  }, [state]);

  // Recuperación desde otro dispositivo: descarga por código y carga el partido.
  const recoverFromBackup = useCallback(async (code: string): Promise<boolean> => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return false;
    try {
      const data = await pullMatch(normalized);
      if (!data) return false;
      setState(migrateGameState({ ...data, activeTimeout: null }));
      setSyncStatus(data.syncCode ? 'SYNCED' : 'INACTIVE');
      return true;
    } catch (e) {
      console.error('Error al recuperar el partido:', e);
      return false;
    }
  }, []);

  const toggleTimer = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  useEffect(() => {
    let interval: any;
    if (state.isRunning && state.timer > 0) {
      interval = setInterval(() => {
        setState((prev) => ({ ...prev, timer: prev.timer - 1 }));
      }, 1000);
    } else if (state.timer === 0) {
      setState((prev) => ({ ...prev, isRunning: false }));
    }
    return () => clearInterval(interval);
  }, [state.isRunning, state.timer]);

  useEffect(() => {
    let interval: any;
    if (state.activeTimeout) {
      interval = setInterval(() => {
        setState((prev) => {
          if (!prev.activeTimeout) return prev;
          if (prev.activeTimeout.timer <= 1) {
            return { ...prev, activeTimeout: null };
          }
          return {
            ...prev,
            activeTimeout: {
              ...prev.activeTimeout,
              timer: prev.activeTimeout.timer - 1
            }
          };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state.activeTimeout]);

  const addPoint = useCallback((teamSide: 'A' | 'B', playerId: string, points: number) => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      const team = prev[teamKey];
      const updatedPlayers = team.players.map(p =>
        p.id === playerId ? { ...p, points: p.points + points } : p
      );

      const newEvent: GameEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        period: prev.period,
        timeRemaining: formatTime(prev.timer),
        teamSide,
        playerId,
        type: points === 1 ? 'POINT1' : points === 2 ? 'POINT2' : 'POINT3',
        description: `${points} pt(s)`,
      };

      return {
        ...prev,
        [teamKey]: { ...team, players: updatedPlayers, score: team.score + points },
        history: [newEvent, ...prev.history],
      };
    });
  }, []);

  const addFoul = useCallback((teamSide: 'A' | 'B', playerId: string, foulSelection: PlayerFoulType | PlayerFoulSelection = 'P') => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      const team = prev[teamKey];
      const newFoul = createPlayerFoul(foulSelection, prev.period);
      const foulLabel = formatPlayerFoul(newFoul);

      let isDisqualified = false;
      let playerName = '';
      let playerNumber = '';

      const updatedPlayers = team.players.map(p => {
        if (p.id === playerId) {
          playerName = p.name;
          playerNumber = p.number;
          const newFouls = [...p.fouls, newFoul];

          if (isPlayerDisqualifiedByFouls(newFouls)) {
            isDisqualified = true;
          }
          return { ...p, fouls: newFouls };
        }
        return p;
      });

      if (isDisqualified) {
        setTimeout(() => alert(`¡JUGADOR DESCALIFICADO!\nEl jugador #${playerNumber} ${playerName} ha sido descalificado y debe ser sustituido.`), 10);
      }

      const updatedFoulsPerPeriod = [...team.foulsPerPeriod];
      const periodIndex = Math.min(prev.period - 1, 3);
      updatedFoulsPerPeriod[periodIndex]++;

      if (updatedFoulsPerPeriod[periodIndex] === 4) {
        setTimeout(() => alert(`¡BONUS!\n${team.name} ha llegado a su 4ª falta colectiva en el periodo.`), 10);
      }

      const newEvent: GameEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        period: prev.period,
        timeRemaining: formatTime(prev.timer),
        teamSide,
        playerId,
        type: 'FOUL',
        subType: newFoul.type,
        foulPenalty: newFoul.penalty,
        description: `Falta ${foulLabel}`,
      };

      return {
        ...prev,
        [teamKey]: { ...team, players: updatedPlayers, foulsPerPeriod: updatedFoulsPerPeriod },
        history: [newEvent, ...prev.history],
      };
    });
  }, []);

  const addCoachFoul = useCallback((teamSide: 'A' | 'B', role: 'HC' | 'AC', foulType: CoachFoul) => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      const team = prev[teamKey];
      const foulField = role === 'HC' ? 'headCoachFouls' : 'assistantCoachFouls';
      const newFouls = [...team[foulField], foulType];

      // Coach Disqualification Rules:
      // HC: 2 'C' fouls, or 3 fouls total (combination of 'B' and 'C').
      // AC: Wait, generally it's 2 C fouls or 3 B/C fouls for the HC (since AC fouls count against HC in some rules, but let's keep it simple for their own fouls).
      const cCount = newFouls.filter(f => f === 'C1').length;
      const totalCount = newFouls.length;
      const hasD = newFouls.some(f => f === 'D' || f === 'D2');

      if (hasD || cCount >= 2 || totalCount >= 3) {
        const coachName = role === 'HC' ? team.headCoach : team.assistantCoach;
        setTimeout(() => alert(`¡ENTRENADOR DESCALIFICADO!\nEl ${role === 'HC' ? 'Entrenador Principal' : 'Ayudante'} ${coachName} ha sido descalificado y debe abandonar el área de juego.`), 10);
      }

      const newEvent: GameEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        period: prev.period,
        timeRemaining: formatTime(prev.timer),
        teamSide,
        type: 'FOUL',
        subType: foulType,
        playerId: role,
        description: `Falta ${foulType} (${role === 'HC' ? 'Principal' : 'Asistente'})`,
      };

      return {
        ...prev,
        [teamKey]: { ...team, [foulField]: [...team[foulField], foulType] },
        history: [newEvent, ...prev.history],
      };
    });
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setState((prev) => {
      const newHistory = prev.history.filter(e => e.id !== eventId);
      const buildCleanTeam = (originalTeam: Team): Team => ({
        ...originalTeam,
        headCoachFouls: [],
        assistantCoachFouls: [],
        score: 0,
        foulsPerPeriod: [0, 0, 0, 0],
        timeouts: [],
        hcc: undefined,
        players: originalTeam.players.map(p => ({ ...p, points: 0, fouls: [] }))
      });

      const newTeamA = buildCleanTeam(prev.teamA);
      const newTeamB = buildCleanTeam(prev.teamB);

      [...newHistory].reverse().forEach(event => {
        const team = event.teamSide === 'A' ? newTeamA : newTeamB;
        if (event.type.startsWith('POINT')) {
          const pts = event.type === 'POINT1' ? 1 : event.type === 'POINT2' ? 2 : 3;
          team.score += pts;
          const player = team.players.find(p => p.id === event.playerId);
          if (player) player.points += pts;
        } else if (event.type === 'FOUL') {
          if (event.subType === 'B1' || event.subType === 'C1' || (event.subType === 'D' && !event.playerId?.includes('-'))) {
            const role = event.playerId === 'AC' ? 'assistantCoachFouls' : 'headCoachFouls';
            (team as any)[role].push(event.subType as CoachFoul);
          } else if (event.playerId) {
            const player = team.players.find(p => p.id === event.playerId);
            if (player) player.fouls.push({
              type: event.subType as PlayerFoulType,
              period: event.period,
              ...(event.foulPenalty ? { penalty: event.foulPenalty } : {})
            });
            const periodIndex = Math.min(event.period - 1, 3);
            team.foulsPerPeriod[periodIndex]++;
          }
        } else if (event.type === 'TIMEOUT') {
          const minsRemaining = parseInt(event.timeRemaining.split(':')[0]);
          team.timeouts.push({ period: event.period, minute: 10 - minsRemaining });
        } else if (event.type === 'HCC') {
          const minsRemaining = parseInt(event.timeRemaining.split(':')[0]);
          team.hcc = { period: event.period, minute: 10 - minsRemaining };
        }
      });
      return { ...prev, teamA: newTeamA, teamB: newTeamB, history: newHistory };
    });
  }, []);

  const updateEvent = useCallback((eventId: string, updates: Partial<GameEvent>) => {
    setState((prev) => {
      const newHistory = prev.history.map(e => e.id === eventId ? { ...e, ...updates } : e);
      const buildCleanTeam = (originalTeam: Team): Team => ({
        ...originalTeam,
        headCoachFouls: [],
        assistantCoachFouls: [],
        score: 0,
        foulsPerPeriod: [0, 0, 0, 0],
        timeouts: [],
        hcc: undefined,
        players: originalTeam.players.map(p => ({ ...p, points: 0, fouls: [] }))
      });
      const newTeamA = buildCleanTeam(prev.teamA);
      const newTeamB = buildCleanTeam(prev.teamB);

      [...newHistory].reverse().forEach(event => {
        const team = event.teamSide === 'A' ? newTeamA : newTeamB;
        if (event.type.startsWith('POINT')) {
          const pts = event.type === 'POINT1' ? 1 : event.type === 'POINT2' ? 2 : 3;
          team.score += pts;
          const player = team.players.find(p => p.id === event.playerId);
          if (player) player.points += pts;
        } else if (event.type === 'FOUL') {
          if (event.subType === 'B1' || event.subType === 'C1' || (event.subType === 'D' && !event.playerId?.includes('-'))) {
            const role = event.playerId === 'AC' ? 'assistantCoachFouls' : 'headCoachFouls';
            (team as any)[role].push(event.subType as CoachFoul);
          } else if (event.playerId) {
            const player = team.players.find(p => p.id === event.playerId);
            if (player) player.fouls.push({
              type: event.subType as PlayerFoulType,
              period: event.period,
              ...(event.foulPenalty ? { penalty: event.foulPenalty } : {})
            });
            const periodIndex = Math.min(event.period - 1, 3);
            team.foulsPerPeriod[periodIndex]++;
          }
        } else if (event.type === 'TIMEOUT') {
          const minsRemaining = parseInt(event.timeRemaining.split(':')[0]);
          team.timeouts.push({ period: event.period, minute: 10 - minsRemaining });
        } else if (event.type === 'HCC') {
          const minsRemaining = parseInt(event.timeRemaining.split(':')[0]);
          team.hcc = { period: event.period, minute: 10 - minsRemaining };
        }
      });
      return { ...prev, teamA: newTeamA, teamB: newTeamB, history: newHistory };
    });
  }, []);

  const setTeamPlayers = useCallback((side: 'A' | 'B', players: Player[]) => {
    setState((prev) => ({
      ...prev,
      [side === 'A' ? 'teamA' : 'teamB']: {
        ...prev[side === 'A' ? 'teamA' : 'teamB'],
        players
      }
    }));
  }, []);

  const updatePlayer = useCallback((teamSide: 'A' | 'B', playerId: string, updates: Partial<Player>) => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      const team = prev[teamKey];
      const finalUpdates = { ...updates };
      if (typeof finalUpdates.name === 'string') finalUpdates.name = finalUpdates.name.toUpperCase();
      const updatedPlayers = team.players.map(p => p.id === playerId ? { ...p, ...finalUpdates } : p);
      return { ...prev, [teamKey]: { ...team, players: updatedPlayers } };
    });
  }, []);

  const togglePlayerEntry = useCallback((teamSide: 'A' | 'B', playerId: string) => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      const team = prev[teamKey];
      let newEvent: GameEvent | null = null;

      const updatedPlayers = team.players.map(p => {
        if (p.id === playerId) {
          const willEnter = !p.hasEntered;
          if (willEnter) {
            newEvent = {
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date().toISOString(),
              period: prev.period,
              timeRemaining: formatTime(prev.timer),
              teamSide,
              playerId,
              type: 'ENTRY',
              description: 'Ingreso al campo',
            };
          }
          return { ...p, hasEntered: willEnter, entryPeriod: willEnter ? prev.period : undefined };
        }
        return p;
      });

      return { 
        ...prev, 
        [teamKey]: { ...team, players: updatedPlayers },
        history: newEvent ? [newEvent as GameEvent, ...prev.history] : prev.history
      };
    });
  }, []);

  const updateTeamName = useCallback((teamSide: 'A' | 'B', name: string) => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      return { ...prev, [teamKey]: { ...prev[teamKey], name: name.toUpperCase() } };
    });
  }, []);

  const updateTeamColor = useCallback((teamSide: 'A' | 'B', color: string) => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          color,
          textColor: getContrastColor(color)
        }
      };
    });
  }, []);

  const updateTeamTextColor = useCallback((teamSide: 'A' | 'B', textColor: string) => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      return { ...prev, [teamKey]: { ...prev[teamKey], textColor } };
    });
  }, []);

  const updateTeamCoach = useCallback((teamSide: 'A' | 'B', field: 'headCoach' | 'assistantCoach', value: string) => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      return { ...prev, [teamKey]: { ...prev[teamKey], [field]: value.toUpperCase() } };
    });
  }, []);

  const updateTeamLogo = useCallback((teamSide: 'A' | 'B', logo: string) => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      return { ...prev, [teamKey]: { ...prev[teamKey], logo } };
    });
  }, []);

  const addTimeout = useCallback((teamSide: 'A' | 'B') => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      const team = prev[teamKey];
      const firstHalfTO = team.timeouts.filter(t => t.period <= 2).length;
      const secondHalfTO = team.timeouts.filter(t => t.period >= 3 && t.period <= 4).length;
      const currentOT_TO = team.timeouts.filter(t => t.period === prev.period).length;

      if (prev.period <= 2 && firstHalfTO >= 2) {
        setTimeout(() => alert(`¡LÍMITE DE TIEMPOS MUERTOS!\n${team.name} ya no dispone de tiempos muertos para la primera mitad.`), 10);
        return prev;
      }
      if ((prev.period === 3 || prev.period === 4) && secondHalfTO >= 3) {
        setTimeout(() => alert(`¡LÍMITE DE TIEMPOS MUERTOS!\n${team.name} ya no dispone de tiempos muertos para la segunda mitad.`), 10);
        return prev;
      }
      if (prev.period >= 5 && currentOT_TO >= 1) {
        setTimeout(() => alert(`¡LÍMITE DE TIEMPOS MUERTOS!\n${team.name} ya no dispone de tiempos muertos para esta prórroga.`), 10);
        return prev;
      }

      if (prev.period === 4 && prev.timer <= 120) {
        const p4TO = team.timeouts.filter(t => t.period === 4 && t.minute <= 2).length;
        if (p4TO >= 2) {
          setTimeout(() => alert(`¡LÍMITE DE TIEMPOS MUERTOS!\nSolo se permiten 2 tiempos muertos en los últimos 2 minutos del partido.`), 10);
          return prev;
        }
      }

      const minute = 10 - Math.floor(prev.timer / 60);
      const newEvent: GameEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        period: prev.period,
        timeRemaining: formatTime(prev.timer),
        teamSide,
        type: 'TIMEOUT',
        description: 'Tiempo Muerto solicitado',
      };
      return {
        ...prev,
        isRunning: false,
        activeTimeout: { side: teamSide, timer: 60 },
        [teamKey]: {
          ...team,
          timeouts: [...team.timeouts, { period: prev.period, minute }]
        },
        history: [newEvent, ...prev.history],
      };
    });
  }, []);

  const cancelTimeout = useCallback(() => {
    setState((prev) => ({ ...prev, activeTimeout: null }));
  }, []);

  const addHCC = useCallback((teamSide: 'A' | 'B') => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      const team = prev[teamKey];
      if (team.hcc) return prev;

      const minute = 10 - Math.floor(prev.timer / 60);
      const newEvent: GameEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        period: prev.period,
        timeRemaining: formatTime(prev.timer),
        teamSide,
        type: 'HCC',
        description: 'Head Coach Challenge',
      };
      return {
        ...prev,
        [teamKey]: {
          ...team,
          hcc: { period: prev.period, minute }
        },
        history: [newEvent, ...prev.history],
      };
    });
  }, []);

  const adjustTimer = useCallback((amount: number) => {
    setState((prev) => ({ ...prev, timer: Math.max(0, prev.timer + amount) }));
  }, []);

  const startGame = useCallback(() => {
    setState((prev) => {
      const updateStartersAndRoster = (team: Team) => {
        let roster = team.players.filter(p => p.isInRoster);
        while (roster.length < ROSTER_LIMIT) {
          roster.push({
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            number: '',
            license: '',
            points: 0,
            fouls: [],
            isStarter: false,
            isCaptain: false,
            isInRoster: true,
            hasEntered: false,
          });
        }
        if (roster.length > ROSTER_LIMIT) roster = roster.slice(0, ROSTER_LIMIT);

        return {
          ...team,
          players: roster.map(p => p.isStarter ? { ...p, hasEntered: true, entryPeriod: 1 } : p)
        };
      };

      return {
        ...prev,
        status: 'PLAYING',
        // Backup online automático: cada partido nuevo genera su código y se
        // sincroniza solo (el push debounced se dispara con el cambio de estado)
        syncCode: prev.syncCode || generateMatchCode(),
        teamA: updateStartersAndRoster(prev.teamA),
        teamB: updateStartersAndRoster(prev.teamB)
      };
    });
  }, []);

  const updateGameInfo = useCallback((updates: Partial<GameState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const goToSetup = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'SETUP', isRunning: false }));
  }, []);

  const resetGame = useCallback(() => {
    setState({
      teamA: createEmptyTeam('EQUIPO A', '#1a237e'),
      teamB: createEmptyTeam('EQUIPO B', '#b71c1c'),
      period: 1,
      timer: INITIAL_TIMER,
      isRunning: false,
      status: 'SETUP',
      history: [],
      competition: 'COMPETICIÓN OFICIAL',
      venue: 'SEDE CENTRAL',
      date: new Date().toLocaleDateString(),
      timeStart: '12:00',
      crewChief: '',
      umpire1: '',
      umpire2: '',
      scorer: '',
      timerOfficial: '',
      shotClockOperator: '',
      activeTimeout: null,
    });
  }, []);

  const nextPeriod = useCallback(() => {
    setState((prev) => {
      const isOT = prev.period >= 4;
      return {
        ...prev,
        period: prev.period + 1,
        timer: isOT ? 300 : INITIAL_TIMER,
        isRunning: false,
        activeTimeout: null,
      };
    });
  }, []);

  const finishGame = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'FINISHED', isRunning: false }));
  }, []);

  const saveGameToLibrary = useCallback((customName: string) => {
    setSavedGames((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: customName || `${state.teamA.name} vs ${state.teamB.name}`,
        date: new Date().toLocaleString(),
        // syncCode se descarta: las plantillas se reutilizan para partidos
        // NUEVOS, y cada partido nuevo debe tener su propio código de backup
        data: { ...state, isRunning: false, status: 'SETUP', syncCode: undefined }
      }
    ]);
  }, [state]);

  const loadGameFromLibrary = useCallback((gameData: GameState) => {
    setState(migrateGameState(gameData));
  }, []);

  const deleteFromLibrary = useCallback((id: string) => {
    setSavedGames((prev) => prev.filter(g => g.id !== id));
  }, []);

  // ─── Catálogo de equipos ───
  const saveTeamToCatalog = useCallback((teamSide: 'A' | 'B') => {
    const team = teamSide === 'A' ? state.teamA : state.teamB;
    const name = team.name.trim() || `EQUIPO ${teamSide}`;
    setSavedTeams((prev) => {
      const data: CatalogTeam['data'] = {
        name: team.name,
        color: team.color,
        textColor: team.textColor,
        logo: team.logo,
        headCoach: team.headCoach,
        assistantCoach: team.assistantCoach,
        players: team.players,
      };
      const existing = prev.find(t => t.name.toUpperCase() === name.toUpperCase());
      if (existing) {
        return prev.map(t => t.id === existing.id ? { ...t, data, updatedAt: new Date().toLocaleString() } : t);
      }
      return [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        name,
        data,
        updatedAt: new Date().toLocaleString(),
      }];
    });
  }, [state]);

  const deleteTeamFromCatalog = useCallback((id: string) => {
    setSavedTeams((prev) => prev.filter(t => t.id !== id));
  }, []);

  const applyTeamToSide = useCallback((teamSide: 'A' | 'B', entry: CatalogTeam) => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      const players: Player[] = entry.data.players.slice(0, MAX_PLAYERS).map(p => ({
        ...p,
        id: Math.random().toString(36).substr(2, 9),
        points: 0,
        fouls: [],
        hasEntered: false,
        entryPeriod: undefined,
      }));
      while (players.length < MAX_PLAYERS) players.push(createEmptyPlayer());
      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          name: entry.data.name,
          color: entry.data.color,
          textColor: entry.data.textColor ?? getContrastColor(entry.data.color),
          logo: entry.data.logo,
          headCoach: entry.data.headCoach,
          assistantCoach: entry.data.assistantCoach,
          players,
        },
      };
    });
  }, []);

  const exportGameToFile = useCallback(async (customName?: string, subfolder: 'partidos' | 'plantillas' = 'partidos') => {
    const safeStr = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = customName || `${safeStr(state.competition)}_${safeStr(state.teamA.name)}_${safeStr(state.teamB.name)}_${safeStr(state.date)}_${safeStr(state.timeStart)}_${safeStr(state.venue)}`;
    const win = window as any;
    if (win.electronAPI) {
      const result = await win.electronAPI.saveMatch(state, fileName, subfolder);
      if (result.success) {
        alert(`Partido guardado con éxito en:\n${result.filePath}`);
      } else if (result.error) {
        alert(`Error al guardar: ${result.error}`);
      }
    } else {
      // Fallback para web: Descarga directa
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", fileName + ".dss");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  }, [state]);

  const importGameFromFile = useCallback(async () => {
    const win = window as any;
    const addToLibrary = (gameData: any) => {
      setSavedGames((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          name: `[IMP] ${gameData.teamA.name} vs ${gameData.teamB.name}`,
          date: new Date().toLocaleString(),
          data: gameData
        }
      ]);
    };

    if (win.electronAPI) {
      const result = await win.electronAPI.loadMatch();
      if (result.success) {
        setState(migrateGameState(result.data));
        addToLibrary(result.data);
        alert('Partido importado y añadido a la biblioteca.');
        return true;
      } else if (result.error) {
        alert(`Error al cargar: ${result.error}`);
      }
    } else {
      // Fallback para web: Input file
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.dss';
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (event: any) => {
            try {
              const data = JSON.parse(event.target.result);
              setState(migrateGameState(data));
              addToLibrary(data);
              alert('Partido importado y añadido a la biblioteca.');
              resolve(true);
            } catch (err) {
              alert('Error al procesar el archivo JSON.');
              resolve(false);
            }
          };
          reader.readAsText(file);
        };
        input.click();
      });
    }
    return false;
  }, []);

  return {
    state,
    savedGames,
    savedTeams,
    toggleTimer,
    addPoint,
    addFoul,
    addCoachFoul,
    setTeamPlayers,
    updatePlayer,
    togglePlayerEntry,
    updateTeamName,
    updateTeamColor,
    updateTeamTextColor,
    updateTeamCoach,
    updateTeamLogo,
    addTimeout,
    cancelTimeout,
    addHCC,
    adjustTimer,
    updateEvent,
    updateGameInfo,
    startGame,
    goToSetup,
    resetGame,
    nextPeriod,
    deleteEvent,
    saveGameToLibrary,
    loadGameFromLibrary,
    deleteFromLibrary,
    exportGameToFile,
    importGameFromFile,
    finishGame,
    saveTeamToCatalog,
    deleteTeamFromCatalog,
    applyTeamToSide,
    syncStatus,
    activateBackup,
    recoverFromBackup,
  };
};
