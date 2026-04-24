import React from 'react';
import JerseyIcon from './JerseyIcon';


interface ScoreboardProps {
  teamAName: string;
  teamBName: string;
  logoA?: string;
  logoB?: string;
  teamAColor?: string;
  teamATextColor?: string;
  teamBColor?: string;
  teamBTextColor?: string;

  scoreA: number;
  scoreB: number;
  teamAFouls: number;
  teamBFouls: number;
  timeoutsA: any[]; // Using any[] for now to avoid import issues if not exported, but it refers to TimeoutRecord[]
  timeoutsB: any[];
  hccA?: any;
  hccB?: any;
  period: number;
  timer: number;
  isRunning: boolean;
  onToggleTimer: () => void;
  onAddTimeout: (side: 'A' | 'B') => void;
  activeTimeout: { side: 'A' | 'B'; timer: number } | null;
  onCancelTimeout: () => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const Scoreboard: React.FC<ScoreboardProps> = ({
  teamAName, teamBName, logoA, logoB,
  teamAColor, teamATextColor, teamBColor, teamBTextColor,
  scoreA, scoreB, teamAFouls, teamBFouls, timeoutsA, timeoutsB, hccA, hccB, 
  period, timer, isRunning, onToggleTimer, onAddTimeout, activeTimeout, onCancelTimeout
}) => {
  const isFirstHalf = period <= 2;
  const isOT = period >= 5;
  const maxTO = isOT ? 1 : (isFirstHalf ? 2 : 3);

  const renderTeamFoulsAndTO = (side: 'A' | 'B', fouls: number, timeouts: any[]) => {
    const usedThisHalfTO = isOT 
      ? timeouts.filter(t => t.period === period).length 
      : (isFirstHalf ? timeouts.filter(t => t.period <= 2).length : timeouts.filter(t => t.period >= 3 && t.period <= 4).length);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: side === 'A' ? 'flex-start' : 'flex-end', minWidth: '80px' }}>
        {/* Faltas de equipo */}
        <div style={{ display: 'flex', gap: '3px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              width: '10px', height: '5px', borderRadius: '1px',
              background: i < fouls ? (fouls >= 4 ? 'var(--fiba-red)' : 'white') : 'rgba(255,255,255,0.2)',
              boxShadow: i < fouls && fouls >= 4 ? '0 0 5px var(--fiba-red)' : 'none'
            }} />
          ))}
        </div>
        {/* Timeouts */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {Array.from({ length: maxTO }).map((_, i) => (
            <div key={i} style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: i < usedThisHalfTO ? 'var(--fiba-yellow)' : 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: i < usedThisHalfTO ? '0 0 4px var(--fiba-yellow)' : 'none'
            }} />
          ))}
          <button onClick={() => onAddTimeout(side)} style={{ 
            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', 
            fontSize: '0.55rem', padding: '0px 3px', borderRadius: '2px', cursor: 'pointer', fontWeight: 700 
          }}>+T</button>
        </div>
      </div>
    );
  };

  return (
    <div className="fiba-gradient-blue animate-fade-in" style={{
      marginBottom: '1rem', borderRadius: '10px', padding: '0.6rem 1.5rem',
      boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
    }}>
      <style>{`
        @keyframes pulse-white {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        
        {/* EQUIPO A: ESCUDO - FALTAS/TO - PUNTAJE */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {logoA ? (
              <img src={logoA} alt={teamAName} style={{ height: '45px', width: '45px', objectFit: 'contain' }} />
            ) : (
              <JerseyIcon color={teamAColor || 'var(--fiba-blue)'} numberColor={teamATextColor || '#ffffff'} number={teamAName ? teamAName[0].toUpperCase() : ''} size={45} />
            )}

          </div>
          {renderTeamFoulsAndTO('A', teamAFouls, timeoutsA)}
          <span style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white', lineHeight: 1, minWidth: '60px', textAlign: 'center' }}>
            {scoreA}
          </span>
        </div>

        {/* CENTRO: PERIODO - RELOJ - TIMEOUT TIMER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', minWidth: '350px' }}>
          
          {/* HCC Equipo A */}
          <div style={{ width: '70px', display: 'flex', justifyContent: 'center' }}>
            {hccA && (
              <div style={{ 
                background: 'var(--fiba-yellow)', color: '#000', fontSize: '0.75rem', 
                padding: '4px 6px', borderRadius: '4px', fontWeight: 900,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '1px solid rgba(0,0,0,0.1)',
                textAlign: 'center', whiteSpace: 'nowrap'
              }} title="Head Coach Challenge usado">
                HCC<br/>
                <span style={{ fontSize: '0.65rem' }}>
                  {hccA.period > 4 ? `OT${hccA.period - 4}` : `Q${hccA.period}`} {hccA.minute}'
                </span>
              </div>
            )}
          </div>

          {/* Timeout Timer Equipo A */}
          <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
            {activeTimeout?.side === 'A' && (
              <div 
                onClick={onCancelTimeout}
                style={{
                  background: '#003a70',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontWeight: 900,
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 0 10px rgba(0,0,0,0.2)',
                  animation: 'pulse-white 1s infinite',
                  userSelect: 'none'
                }}
              >
                {activeTimeout.timer}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', padding: '0 1.5rem', borderLeft: '2px solid rgba(255,255,255,0.1)', borderRight: '2px solid rgba(255,255,255,0.1)', minWidth: '180px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {period > 4 ? `OT${period - 4 > 1 ? period - 4 : ''}` : `PERIODO ${period}`}
            </span>
            <div onClick={onToggleTimer} style={{
              fontSize: '2.2rem', fontFamily: 'monospace', color: 'white', cursor: 'pointer',
              padding: '0.1rem 0.8rem', background: 'rgba(0,0,0,0.4)', borderRadius: '6px',
              border: `2px solid ${isRunning ? 'var(--fiba-green)' : 'var(--fiba-yellow)'}`,
              lineHeight: 1.1, userSelect: 'none', transition: 'all 0.3s',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              {formatTime(timer)}
              <span style={{ fontSize: '0.8rem', color: isRunning ? 'var(--fiba-green)' : 'var(--fiba-yellow)' }}>{isRunning ? '▶' : '⏸'}</span>
            </div>
          </div>

          {/* Timeout Timer Equipo B */}
          <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
            {activeTimeout?.side === 'B' && (
              <div 
                onClick={onCancelTimeout}
                style={{
                  background: '#003a70',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontWeight: 900,
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 0 10px rgba(0,0,0,0.2)',
                  animation: 'pulse-white 1s infinite',
                  userSelect: 'none'
                }}
              >
                {activeTimeout.timer}
              </div>
            )}
          </div>
          
          {/* HCC Equipo B */}
          <div style={{ width: '70px', display: 'flex', justifyContent: 'center' }}>
            {hccB && (
              <div style={{ 
                background: 'var(--fiba-yellow)', color: '#000', fontSize: '0.75rem', 
                padding: '4px 6px', borderRadius: '4px', fontWeight: 900,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '1px solid rgba(0,0,0,0.1)',
                textAlign: 'center', whiteSpace: 'nowrap'
              }} title="Head Coach Challenge usado">
                HCC<br/>
                <span style={{ fontSize: '0.65rem' }}>
                  {hccB.period > 4 ? `OT${hccB.period - 4}` : `Q${hccB.period}`} {hccB.minute}'
                </span>
              </div>
            )}
          </div>
        </div>

        {/* EQUIPO B: PUNTAJE - FALTAS/TO - ESCUDO */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white', lineHeight: 1, minWidth: '60px', textAlign: 'center' }}>
            {scoreB}
          </span>
          {renderTeamFoulsAndTO('B', teamBFouls, timeoutsB)}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {logoB ? (
              <img src={logoB} alt={teamBName} style={{ height: '45px', width: '45px', objectFit: 'contain' }} />
            ) : (
              <JerseyIcon color={teamBColor || 'var(--fiba-blue)'} numberColor={teamBTextColor || '#ffffff'} number={teamBName ? teamBName[0].toUpperCase() : ''} size={45} />
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default Scoreboard;
