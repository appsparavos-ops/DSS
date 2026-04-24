import React from 'react';
import type { PlayerFoulType, CoachFoul, PendingAction } from '../types';
import JerseyIcon from './JerseyIcon';

interface ActionPanelProps {
  selectedPlayerName?: string;
  selectedSide?: 'A' | 'B' | null;
  onAddPoint: (pts: number) => void;
  onAddFoul: (type: PlayerFoulType) => void;
  onAddCoachFoul: (type: CoachFoul) => void;
  onAddTimeout: () => void;
  onAddHCC: () => void;
  disabled: boolean;
  isCoachSelected: boolean;
  selectedTargetType?: 'PLAYER' | 'COACH' | null;
  pendingAction: PendingAction | null;
  selectedPlayerNumber?: string;
  selectedTeamColor?: string;
  selectedTeamTextColor?: string;
  isSelectedPlayerCaptain?: boolean;
  canRequestTimeout?: boolean;
}

const ActionPanel: React.FC<ActionPanelProps> = ({ 
  selectedPlayerName, selectedSide, onAddPoint, onAddFoul, onAddCoachFoul, onAddTimeout, onAddHCC, isCoachSelected, selectedTargetType, pendingAction,
  selectedPlayerNumber, selectedTeamColor, selectedTeamTextColor, isSelectedPlayerCaptain, canRequestTimeout
}) => {
  const points = [1, 2, 3];
  const playerFouls: PlayerFoulType[] = ['P', 'P1', 'P2', 'P3', 'U2', 'T1', 'D'];
  const coachFouls: CoachFoul[] = ['C1', 'B1', 'D'];
  const isTOAllowed = isCoachSelected || (isSelectedPlayerCaptain && canRequestTimeout);

  return (
    <div style={{ 
      width: '320px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '20px', 
      padding: '20px', 
      background: 'white', 
      borderRadius: '16px', 
      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      border: '1px solid #eee',
      alignSelf: 'flex-start',
      position: 'sticky',
      top: '20px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#888', fontSize: '0.75rem', textTransform: 'uppercase' }}>Jugador Seleccionado</h4>
        <div style={{ 
          fontSize: '1.2rem', 
          fontWeight: 800, 
          color: selectedSide === 'A' ? 'var(--fiba-blue)' : (selectedSide === 'B' ? 'var(--fiba-red)' : '#ccc'),
          padding: '10px',
          background: '#f8f9fa',
          borderRadius: '8px',
          minHeight: '45px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {selectedTargetType === 'PLAYER' && selectedPlayerNumber && (
            <div style={{ marginRight: '10px' }}>
              <JerseyIcon color={selectedTeamColor || '#ccc'} numberColor={selectedTeamTextColor || '#fff'} number={selectedPlayerNumber} size={40} />
            </div>
          )}
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedPlayerName || 'SELECCIONE JUGADOR'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#aaa', textTransform: 'uppercase' }}>Puntos</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {points.map(p => (
            <button 
              key={p}
              onClick={() => onAddPoint(p)}
              style={{
                flex: 1, padding: '15px', fontSize: '1.2rem', fontWeight: 900,
                background: (pendingAction?.type === 'POINT' && pendingAction.value === p) ? 'var(--fiba-yellow)' : 'var(--fiba-green)',
                color: (pendingAction?.type === 'POINT' && pendingAction.value === p) ? '#333' : 'white', 
                border: 'none',
                borderRadius: '10px', cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: (pendingAction?.type === 'POINT' && pendingAction.value === p) ? '0 0 15px var(--fiba-yellow)' : '0 4px 0 #2e7d32',
                transform: (pendingAction?.type === 'POINT' && pendingAction.value === p) ? 'scale(1.05)' : 'none'
              }}
              className="action-btn"
            >
              +{p}
            </button>
          ))}
        </div>
      </div>



      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#aaa', textTransform: 'uppercase' }}>Faltas</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {!isCoachSelected ? (
            playerFouls.map(f => (
              <button 
                key={f}
                onClick={() => onAddFoul(f)}
                style={{
                  flex: 1, padding: '12px 5px', fontSize: '0.9rem', fontWeight: 800,
                  background: (pendingAction?.type === 'FOUL' && pendingAction.value === f) ? 'var(--fiba-yellow)' : (f === 'D' ? 'var(--fiba-red)' : 'rgba(255,255,255,0.5)'), 
                  color: (pendingAction?.type === 'FOUL' && pendingAction.value === f) ? '#333' : (f === 'D' ? 'white' : '#333'), border: 'none',
                  borderRadius: '8px', cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (pendingAction?.type === 'FOUL' && pendingAction.value === f) ? '0 0 10px var(--fiba-yellow)' : 'none',
                  transform: (pendingAction?.type === 'FOUL' && pendingAction.value === f) ? 'scale(1.05)' : 'none'
                }}
                className="action-btn"
              >
                {f}
              </button>
            ))
          ) : (
            <>
              {coachFouls.map(f => (
                <button 
                  key={f}
                  onClick={() => onAddCoachFoul(f)}
                  style={{
                    padding: '12px 5px', fontSize: '0.9rem', fontWeight: 800,
                    background: (pendingAction?.type === 'FOUL' && pendingAction.value === f) ? 'var(--fiba-yellow)' : 'rgba(228, 0, 43, 0.8)', 
                    color: (pendingAction?.type === 'FOUL' && pendingAction.value === f) ? '#333' : 'white', border: 'none',
                    borderRadius: '8px', cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: (pendingAction?.type === 'FOUL' && pendingAction.value === f) ? '0 0 10px var(--fiba-yellow)' : 'none',
                    transform: (pendingAction?.type === 'FOUL' && pendingAction.value === f) ? 'scale(1.05)' : 'none'
                  }}
                  className="action-btn"
                >
                  {f}
                </button>
              ))}
              <button 
                onClick={onAddHCC}
                style={{
                  padding: '12px 5px', fontSize: '0.9rem', fontWeight: 800,
                  background: pendingAction?.type === 'HCC' ? 'var(--fiba-yellow)' : 'rgba(0, 85, 164, 0.8)', 
                  color: pendingAction?.type === 'HCC' ? '#333' : 'white', border: 'none',
                  borderRadius: '8px', cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: pendingAction?.type === 'HCC' ? '0 0 10px var(--fiba-yellow)' : 'none',
                  transform: pendingAction?.type === 'HCC' ? 'scale(1.05)' : 'none'
                }}
                className="action-btn"
              >
                HCC
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <button 
          onClick={onAddTimeout}
          style={{
            width: '100%', padding: '12px', 
            background: pendingAction?.type === 'TIMEOUT' ? 'var(--fiba-yellow)' : 'var(--fiba-yellow)', 
            color: '#333', border: 'none', borderRadius: '8px', fontWeight: 800,
            cursor: !isTOAllowed ? 'not-allowed' : 'pointer', 
            opacity: !isTOAllowed ? 0.3 : 1,
            boxShadow: pendingAction?.type === 'TIMEOUT' ? '0 0 10px var(--fiba-yellow)' : 'none'
          }}
          disabled={!isTOAllowed}
        >
          TIEMPO MUERTO (TO)
        </button>
      </div>

      <style>{`
        .action-btn:active { transform: translateY(2px); box-shadow: none !important; }
        .action-btn:hover:not(:disabled) { filter: brightness(1.1); }
      `}</style>
    </div>
  );
};

export default ActionPanel;
