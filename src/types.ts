// Definiciones básicas de tipos para el Digital Score Sheet
export type PlayerFoulType = 'P' | 'P1' | 'P2' | 'P3' | 'T1' | 'U2' | 'D';
export type CoachFoul = 'C1' | 'B1' | 'D2' | 'D';

export interface PlayerFoul {
  type: PlayerFoulType;
  period: number;
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

export type EventType = 'POINT1' | 'POINT2' | 'POINT3' | 'FOUL' | 'TIMEOUT' | 'HCC' | 'ENTRY';

export interface GameEvent {
  id: string;
  timestamp: string;
  period: number;
  timeRemaining: string;
  teamSide: 'A' | 'B';
  type: EventType;
  subType?: PlayerFoulType | CoachFoul;
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
}
export interface PendingAction {
  type: 'POINT' | 'FOUL' | 'TIMEOUT' | 'HCC' | 'ENTRY';
  value?: any;
}
