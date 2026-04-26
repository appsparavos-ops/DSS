import React from 'react';
import type { Player, CoachFoul, HCCRecord } from '../types';
import JerseyIcon from './JerseyIcon';

interface CompactPlayerRowProps {
  player: Player;
  isSelected: boolean;
  onSelect: () => void;
  color?: string;
  textColor?: string;
  side: 'A' | 'B';
}

const CompactPlayerRow: React.FC<CompactPlayerRowProps> = ({ player, isSelected, onSelect, color, textColor, side }) => {
  const getFoulColor = (period: number) => {
    if (period === 1 || period === 3) return 'var(--fiba-red)';
    return 'var(--fiba-blue)';
  };

  const uCount = player.fouls.filter(f => f.type === 'U2').length;
  const tCount = player.fouls.filter(f => f.type === 'T1').length;
  const isDoubleTU = uCount >= 2 || tCount >= 2 || (uCount >= 1 && tCount >= 1);
  const hasD = player.fouls.some(f => f.type === 'D');
  const has5Fouls = player.fouls.length >= 5;
  const isDisqualified = has5Fouls || isDoubleTU || hasD;

  if (!player.name.trim() && !player.number.trim()) return null;

  return (
    <div 
      className="compact-player-row"
      onClick={isDisqualified ? undefined : onSelect}
      style={{
        display: 'flex',
        flexDirection: side === 'A' ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        background: isDisqualified ? 'rgba(255, 241, 240, 0.7)' : (isSelected ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 255, 255, 0.4)'),
        border: isDisqualified ? '2px solid var(--fiba-red)' : (isSelected ? '2px solid var(--fiba-yellow)' : '1px solid rgba(255,255,255,0.6)'),
        borderRadius: '6px',
        cursor: isDisqualified ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        marginBottom: '2px',
        boxShadow: isDisqualified ? 'none' : (isSelected ? '0 2px 6px rgba(255, 215, 0, 0.2)' : 'none'),
        transform: isSelected ? 'scale(1.005)' : 'none',
        opacity: isDisqualified && !isSelected ? 0.8 : ((player.isStarter || player.hasEntered || isSelected) ? 1 : 0.4)
      }}
    >
      <div className="compact-player-jersey-wrapper">
        <JerseyIcon 
          color={isSelected ? 'var(--fiba-yellow)' : (isDisqualified ? 'var(--fiba-red)' : (color || 'var(--fiba-blue)'))} 
          numberColor={isSelected ? '#333' : (textColor || 'white')} 
          number={player.number}
          size={36}
        />
      </div>

      {/* Indicador de entrada (X) */}
      <div className="compact-entry-indicator" style={{ 
        width: '18px', 
        height: '18px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: player.isStarter ? `2px solid var(--fiba-blue)` : 'none',
        borderRadius: '50%',
        color: (player.isStarter || player.hasEntered) ? (player.isStarter ? 'var(--fiba-blue)' : getFoulColor(player.entryPeriod || 1)) : 'transparent',
        fontSize: '0.8rem',
        fontWeight: 900,
        background: 'transparent',
        flexShrink: 0
      }}>
        {(player.isStarter || player.hasEntered) ? 'X' : ''}
      </div>

      <div className="compact-player-info" style={{ 
        flex: 1, 
        fontWeight: 700, 
        fontSize: '0.9rem', 
        color: isSelected ? 'var(--fiba-blue)' : '#333', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis', 
        whiteSpace: 'nowrap',
        textAlign: side === 'A' ? 'right' : 'left'
      }}>
        {player.name} {player.isCaptain && <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 800 }}> (CAP)</span>}
      </div>
      <div className="compact-player-foul-container" style={{ display: 'flex', gap: '4px', padding: '0 8px' }}>
        {Array.from({ length: 5 }).map((_, i) => {
          const foul = player.fouls[i];
          const uCount = player.fouls.filter(f => f.type === 'U2').length;
          const tCount = player.fouls.filter(f => f.type === 'T1').length;
          const isDoubleTU = uCount >= 2 || tCount >= 2 || (uCount >= 1 && tCount >= 1);
          const hasD = player.fouls.some(f => f.type === 'D');
          const has5Fouls = player.fouls.length >= 5;

          let content = foul ? foul.type : '';
          let bgColor = foul ? getFoulColor(foul.period) : 'transparent';
          
          if (!foul && i < 5 && (isDoubleTU || hasD)) {
            content = 'GD';
            const lastFoul = player.fouls[player.fouls.length - 1];
            bgColor = lastFoul ? getFoulColor(lastFoul.period) : '#666';
          } else if (i === 4 && has5Fouls) {
            content = (foul?.type || '') + ' GD';
          }

          if (!content && !foul) return <div key={i} style={{ width: '20px' }} />;

          return (
            <div className="compact-player-foul-item" key={i} style={{
              minWidth: '20px', height: '20px', borderRadius: '4px',
              background: bgColor,
              color: 'white', fontSize: '0.6rem', fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', boxShadow: bgColor === 'transparent' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              {content}
            </div>
          );
        })}
      </div>
      <div className="compact-player-points-display" style={{ fontSize: '1.1rem', fontWeight: 900, color: '#000000', minWidth: '25px', textAlign: 'right' }}>
        {player.points}
      </div>
    </div>
  );
};

interface CompactTeamListProps {
  teamName: string;
  players: Player[];
  side: 'A' | 'B';
  selectedPlayerId?: string;
  onSelectPlayer: (id: string) => void;
  color?: string;
  textColor?: string;
  headCoach: string;
  assistantCoach: string;
  headCoachFouls: CoachFoul[];
  assistantCoachFouls: CoachFoul[];
  onSelectCoach: (role: 'HC' | 'AC') => void;
  selectedCoachRole?: 'HC' | 'AC' | null;
  hcc?: HCCRecord;
}

const CompactTeamList: React.FC<CompactTeamListProps> = ({ 
  teamName, players, selectedPlayerId, onSelectPlayer, color, textColor,
  headCoach, assistantCoach, headCoachFouls, assistantCoachFouls,
  onSelectCoach, selectedCoachRole, hcc, side
}) => {
  return (
    <div className="compact-team-list-container" style={{ flex: 2, minWidth: '380px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h3 style={{ 
        margin: 0, padding: '10px', background: color || 'var(--fiba-blue)', 
        color: textColor || 'white', borderRadius: '8px', textAlign: 'center', fontSize: '1rem',
        textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 900
      }}>
        {teamName}
      </h3>
      
      <div className="player-list-scroll player-list-grid" style={{ overflowY: 'auto', maxHeight: '60vh', paddingRight: '5px' }}>
        {[...players]
          .filter(p => p.name || p.number)
          .sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0))
          .map(player => (
          <CompactPlayerRow 
            key={player.id} 
            player={player} 
            isSelected={selectedPlayerId === player.id}
            onSelect={() => onSelectPlayer(player.id)}
            color={color}
            textColor={textColor}
            side={side}
          />
        ))}
      </div>

      <div className="coaches-container" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {headCoach && (
          <div 
            className="coach-row"
            onClick={() => onSelectCoach('HC')}
            style={{
              padding: '8px 12px', borderRadius: '8px', background: selectedCoachRole === 'HC' ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.4)',
              border: selectedCoachRole === 'HC' ? '2px solid var(--fiba-yellow)' : '1px solid rgba(255,255,255,0.6)',
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexDirection: side === 'A' ? 'row-reverse' : 'row'
            }}
          >
            <div className="coach-role" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: side === 'A' ? 'row-reverse' : 'row' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#666' }}>HC: {headCoach}</span>
              {hcc && (
                <div style={{ display: 'flex', gap: '2px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#eee', border: '1px solid #ccc', borderRadius: '3px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{hcc.period}</div>
                  <div style={{ width: '16px', height: '16px', background: '#eee', border: '1px solid #ccc', borderRadius: '3px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{hcc.minute}</div>
                </div>
              )}
            </div>
            <div className="coach-fouls" style={{ display: 'flex', gap: '2px', flexDirection: side === 'A' ? 'row-reverse' : 'row' }}>
              {headCoachFouls.map((f, i) => <span key={i} style={{ color: 'var(--fiba-red)', fontWeight: 800, fontSize: '0.8rem' }}>{f}</span>)}
            </div>
          </div>
        )}
        {assistantCoach && (
          <div 
            className="coach-row"
            onClick={() => onSelectCoach('AC')}
            style={{
              padding: '8px 12px', borderRadius: '8px', background: selectedCoachRole === 'AC' ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.4)',
              border: selectedCoachRole === 'AC' ? '2px solid var(--fiba-yellow)' : '1px solid rgba(255,255,255,0.6)',
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexDirection: side === 'A' ? 'row-reverse' : 'row'
            }}
          >
            <span className="coach-role" style={{ fontSize: '0.7rem', fontWeight: 800, color: '#666' }}>AC: {assistantCoach}</span>
            <div className="coach-fouls" style={{ display: 'flex', gap: '2px', flexDirection: side === 'A' ? 'row-reverse' : 'row' }}>
              {assistantCoachFouls.map((f, i) => <span key={i} style={{ color: 'var(--fiba-red)', fontWeight: 800, fontSize: '0.8rem' }}>{f}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompactTeamList;
