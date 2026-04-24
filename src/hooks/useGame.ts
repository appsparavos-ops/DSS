import { useState, useCallback, useEffect } from 'react';
import type {
  GameState,
  Team,
  Player,
  GameEvent,
  PlayerFoulType,
  CoachFoul
} from '../types';

const INITIAL_TIMER = 600; // 10 minutos por cuarto

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

const createEmptyTeam = (name: string, color: string): Team => ({
  name,
  color,
  textColor: getContrastColor(color),
  headCoach: '',
  assistantCoach: '',
  headCoachFouls: [],
  assistantCoachFouls: [],
  players: Array.from({ length: 12 }, () => ({
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
  })),
  score: 0,
  foulsPerPeriod: [0, 0, 0, 0],
  timeouts: [],
  hcc: undefined,
});

export const useGame = () => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('dss_game_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migración: corregir jugadores vacíos que tenían isInRoster: true por el bug inicial
        const migrateTeam = (team: Team): Team => ({
          ...team,
          players: team.players.map(p =>
            (!p.name.trim() && !p.number.trim() && p.isInRoster)
              ? { ...p, isInRoster: false, isStarter: false, isCaptain: false }
              : p
          )
        });
        return {
          activeTimeout: null,
          ...parsed,
          teamA: migrateTeam(parsed.teamA),
          teamB: migrateTeam(parsed.teamB),
        };
      } catch (e) {
        console.error('Error al cargar estado:', e);
      }
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
    const saved = localStorage.getItem('dss_library');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('dss_game_state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem('dss_library', JSON.stringify(savedGames));
  }, [savedGames]);

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

  const addFoul = useCallback((teamSide: 'A' | 'B', playerId: string, foulType: PlayerFoulType = 'P') => {
    setState((prev) => {
      const teamKey = teamSide === 'A' ? 'teamA' : 'teamB';
      const team = prev[teamKey];

      let isDisqualified = false;
      let playerName = '';
      let playerNumber = '';

      const updatedPlayers = team.players.map(p => {
        if (p.id === playerId) {
          playerName = p.name;
          playerNumber = p.number;
          const newFouls = [...p.fouls, { type: foulType, period: prev.period }];
          const uCount = newFouls.filter(f => f.type === 'U2').length;
          const tCount = newFouls.filter(f => f.type === 'T1').length;
          const isDoubleTU = uCount >= 2 || tCount >= 2 || (uCount >= 1 && tCount >= 1);
          const hasD = newFouls.some(f => f.type === 'D');

          if (newFouls.length >= 5 || isDoubleTU || hasD) {
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
        subType: foulType,
        description: `Falta ${foulType}`,
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
            if (player) player.fouls.push({ type: event.subType as PlayerFoulType, period: event.period });
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
            if (player) player.fouls.push({ type: event.subType as PlayerFoulType, period: event.period });
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
        while (roster.length < 12) {
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
        if (roster.length > 12) roster = roster.slice(0, 12);

        return {
          ...team,
          players: roster.map(p => p.isStarter ? { ...p, hasEntered: true, entryPeriod: 1 } : p)
        };
      };

      return {
        ...prev,
        status: 'PLAYING',
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
        data: { ...state, isRunning: false, status: 'SETUP' }
      }
    ]);
  }, [state]);

  const loadGameFromLibrary = useCallback((gameData: GameState) => {
    setState(gameData);
  }, []);

  const deleteFromLibrary = useCallback((id: string) => {
    setSavedGames((prev) => prev.filter(g => g.id !== id));
  }, []);

  const exportGameToFile = useCallback(async (customName?: string) => {
    const safeStr = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = customName || `${safeStr(state.competition)}_${safeStr(state.teamA.name)}_${safeStr(state.teamB.name)}_${safeStr(state.date)}_${safeStr(state.timeStart)}_${safeStr(state.venue)}`;
    const win = window as any;
    if (win.electronAPI) {
      const result = await win.electronAPI.saveMatch(state, fileName);
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
        setState(result.data);
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
              setState(data);
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
  };
};
