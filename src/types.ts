// Definiciones básicas de tipos para el Digital Score Sheet
export type PlayerFoulPenalty = '1' | '2' | '3' | 'C';
export type PlayerFoulType =
  | 'P'
  | 'P1'
  | 'P2'
  | 'P3'
  | 'T'
  | 'T1'
  | 'T_DISQUALIFYING'
  | 'T_DELAY'
  | 'DI'
  | 'FL'
  | 'U2'
  | 'D';

export interface PlayerFoulSelection {
  type: PlayerFoulType;
  penalty?: PlayerFoulPenalty;
}
export type CoachFoul = 'C1' | 'B1' | 'D2' | 'D';

export interface PlayerFoul {
  type: PlayerFoulType;
  period: number;
  penalty?: PlayerFoulPenalty;
}

export interface Player {
  id: string;
  name: string;
  number: string;
  license?: string;
  points: number;
  fouls: PlayerFoul[];
  isStarter: boolean;
  isCaptain: boolean;
  isInRoster: boolean;
  hasEntered: boolean;
  entryPeriod?: number;
}

export interface TimeoutRecord {
  period: number;
  minute: number;
}

export interface HCCRecord {
  period: number;
  minute: number;
}

export interface Team {
  name: string;
  color: string;
  textColor?: string;
  logo?: string;
  headCoach: string;
  assistantCoach: string;
  headCoachFouls: CoachFoul[];
  assistantCoachFouls: CoachFoul[];
  players: Player[];
  score: number;
  foulsPerPeriod: number[];
  timeouts: TimeoutRecord[];
  hcc?: HCCRecord;
}

export type EventType = 'POINT1' | 'POINT2' | 'POINT3' | 'FOUL' | 'TIMEOUT' | 'HCC' | 'ENTRY' | 'POSSESSION';

export interface GameEvent {
  id: string;
  timestamp: string;
  period: number;
  timeRemaining: string;
  teamSide: 'A' | 'B';
  type: EventType;
  subType?: PlayerFoulType | CoachFoul;
  foulPenalty?: PlayerFoulPenalty;
  playerId?: string;
  description: string;
}

export interface GameState {
  teamA: Team;
  teamB: Team;
  period: number;
  timer: number;
  isRunning: boolean;
  status: 'SETUP' | 'PLAYING' | 'FINISHED';
  history: GameEvent[];
  // Metadata del partido
  competition: string;
  venue: string;
  date: string;
  timeStart: string;
  crewChief: string;
  umpire1: string;
  umpire2: string;
  scorer: string;
  timerOfficial: string;
  shotClockOperator: string;
  activeTimeout: {
    side: 'A' | 'B';
    timer: number;
  } | null;
  /** Flecha de posesión alterna: apunta al equipo del próximo saque de posesión alterna */
  possessionArrow: 'A' | 'B' | null;
  /** Código del backup online (Firestore). Presente cuando el backup está activo. */
  syncCode?: string;
}
export interface PendingAction {
  type: 'POINT' | 'FOUL' | 'TIMEOUT' | 'HCC' | 'ENTRY';
  value?: any;
}

// Equipo guardado en el catálogo (plantel reutilizable entre partidos)
export interface CatalogTeam {
  id: string;
  name: string;
  updatedAt: string;
  data: {
    name: string;
    color: string;
    textColor?: string;
    logo?: string;
    headCoach: string;
    assistantCoach: string;
    players: Player[];
  };
}
