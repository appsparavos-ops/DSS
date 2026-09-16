import React, { useState } from 'react';
import type { PlayerFoulType, CoachFoul, PendingAction, PlayerFoulSelection } from '../types';
import JerseyIcon from './JerseyIcon';
import { formatPlayerFoul, normalizePlayerFoul } from '../utils/foulRules';

interface ActionPanelProps {
  selectedPlayerName?: string;
  selectedSide?: 'A' | 'B' | null;
  onAddPoint: (pts: number) => void;
  onAddFoul: (type: PlayerFoulType | PlayerFoulSelection) => void;
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
  onOpenHistory: () => void;
}

const ActionPanel: React.FC<ActionPanelProps> = ({ 
  selectedPlayerName, selectedSide, onAddPoint, onAddFoul, onAddCoachFoul, onAddTimeout, onAddHCC, isCoachSelected, selectedTargetType, pendingAction,
  selectedPlayerNumber, selectedTeamColor, selectedTeamTextColor, isSelectedPlayerCaptain, canRequestTimeout, onOpenHistory
}) => {
  const points = [1, 2, 3];
  const [openFoulGroup, setOpenFoulGroup] = useState<number | null>(null);
  const personalFouls: PlayerFoulSelection[] = [
    { type: 'P' },
    { type: 'P', penalty: '1' },
    { type: 'P', penalty: '2' },
    { type: 'P', penalty: '3' },
  ];
  // FIBA 2026: al presionar T se despliegan las 2 categorías de técnica;
  // al presionar U se despliegan Disruptiva (DI) y Flagrante (FL).
  const foulGroups: {
    label: string;
    tooltip: string;
    sections: { title: string; subtitle?: string; fouls: PlayerFoulSelection[] }[];
  }[] = [
    {
      label: 'T',
      tooltip: 'Técnicas: Categoría 1 (conducta) y Categoría 2 (demora)',
      sections: [
        {
          title: 'TÉCNICA CAT. 1 (CONDUCTA)',
          subtitle: 'Circulada en el acta · Acumula para descalificación',
          fouls: [
            { type: 'T', penalty: '1' },
            { type: 'T', penalty: 'C' },
          ],
        },
        {
          title: 'T DEMORA CAT. 2',
          subtitle: 'Sin círculo en el acta · No acumula para descalificación',
          fouls: [
            { type: 'T_DELAY', penalty: '1' },
            { type: 'T_DELAY', penalty: 'C' },
          ],
        },
      ],
    },
    {
      label: 'U',
      tooltip: 'Antideportivas: Flagrante (FL) y Disruptiva (DI)',
      sections: [
        {
          title: 'FLAGRANTE (FL)',
          subtitle: 'Circulada en el acta · Acumula para descalificación',
          fouls: [
            { type: 'FL', penalty: '1' },
            { type: 'FL', penalty: '2' },
            { type: 'FL', penalty: '3' },
            { type: 'FL', penalty: 'C' },
          ],
        },
        {
          title: 'DISRUPTIVA (DI)',
          subtitle: 'No acumula para descalificación',
          fouls: [
            { type: 'DI', penalty: '1' },
            { type: 'DI', penalty: '2' },
            { type: 'DI', penalty: '3' },
            { type: 'DI', penalty: 'C' },
          ],
        },
      ],
    },
  ];
  const coachFouls: CoachFoul[] = ['C1', 'B1', 'D'];
  const isTOAllowed = isCoachSelected || (isSelectedPlayerCaptain && canRequestTimeout);
  const isSameFoul = (a: unknown, b: PlayerFoulSelection) => {
    if (!a || typeof a !== 'object' || !('type' in a)) return false;
    const left = normalizePlayerFoul(a as PlayerFoulSelection);
    const right = normalizePlayerFoul(b);
    return left.type === right.type && left.penalty === right.penalty;
  };
  const addPlayerFoul = (foul: PlayerFoulSelection) => {
    setOpenFoulGroup(null);
    onAddFoul(foul);
  };

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
      <button 
        onClick={onOpenHistory}
        style={{
          width: '100%', padding: '12px', 
          background: '#f0f0f0', color: '#555', border: '1px solid #ddd', borderRadius: '8px', 
          fontWeight: 800, cursor: 'pointer', marginBottom: '5px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition: 'all 0.2s'
        }}
        className="action-btn"
      >
        📜 VER HISTORIAL
      </button>

      <div style={{ textAlign: 'center' }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#888', fontSize: '0.75rem', textTransform: 'uppercase' }}>Jugador Seleccionado</h4>
        <div style={{ 
          fontSize: '1.2rem', 
          fontWeight: 800, 
          color: selectedSide === 'A' ? 'var(--fiba-blue)' : (selectedSide === 'B' ? 'var(--fiba-red)' : '#ccc'),
          padding: '10px',
          background: '#f8f9fa',
          borderRadius: '8px',
          height: '60px', /* Altura fija para evitar salto */
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {selectedTargetType === 'PLAYER' && selectedPlayerNumber && (
            <div style={{ marginRight: '10px', width: '40px', height: '40px', flexShrink: 0 }}>
              <JerseyIcon color={selectedTeamColor || '#ccc'} numberColor={selectedTeamTextColor || '#fff'} number={selectedPlayerNumber} size={40} />
            </div>
          )}
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedPlayerName || 'SELECCIONE JUGADOR'}
          </div>
        </div>
      </div>

      {!isCoachSelected && (
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
      )}



      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#aaa', textTransform: 'uppercase' }}>Faltas</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {!isCoachSelected ? (
            <>
            {personalFouls.map(f => (
              <button 
                key={formatPlayerFoul(f)}
                onClick={() => addPlayerFoul(f)}
                style={{
                  flex: 1, padding: '12px 5px', fontSize: '0.9rem', fontWeight: 800,
                  background: (pendingAction?.type === 'FOUL' && isSameFoul(pendingAction.value, f)) ? 'var(--fiba-yellow)' : 'rgba(255,255,255,0.5)', 
                  color: (pendingAction?.type === 'FOUL' && isSameFoul(pendingAction.value, f)) ? '#333' : '#333', border: 'none',
                  borderRadius: '8px', cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (pendingAction?.type === 'FOUL' && isSameFoul(pendingAction.value, f)) ? '0 0 10px var(--fiba-yellow)' : 'none',
                  transform: (pendingAction?.type === 'FOUL' && isSameFoul(pendingAction.value, f)) ? 'scale(1.05)' : 'none'
                }}
                className="action-btn"
              >
                {formatPlayerFoul(f)}
              </button>
            ))}
              {foulGroups.map((group, idx) => (
                <button 
                  key={group.label}
                  onClick={() => setOpenFoulGroup(openFoulGroup === idx ? null : idx)}
                  title={group.tooltip}
                  style={{
                    padding: '12px 5px', fontSize: '0.9rem', fontWeight: 800,
                    background: openFoulGroup === idx ? 'var(--fiba-yellow)' : 'rgba(255,255,255,0.5)',
                    color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  className="action-btn"
                >
                  {group.label}
                </button>
              ))}
              <button 
                onClick={() => addPlayerFoul({ type: 'D' })}
                style={{
                  padding: '12px 5px', fontSize: '0.9rem', fontWeight: 800,
                  background: (pendingAction?.type === 'FOUL' && isSameFoul(pendingAction.value, { type: 'D' })) ? 'var(--fiba-yellow)' : 'var(--fiba-red)',
                  color: (pendingAction?.type === 'FOUL' && isSameFoul(pendingAction.value, { type: 'D' })) ? '#333' : 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="action-btn"
              >
                D
              </button>
            </>
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
        {!isCoachSelected && openFoulGroup !== null && foulGroups[openFoulGroup] && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {foulGroups[openFoulGroup].sections.map(section => (
              <div key={section.title}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#333', textTransform: 'uppercase', marginBottom: '2px' }}>
                  {section.title}
                </div>
                {section.subtitle && (
                  <div style={{ fontSize: '0.62rem', color: '#999', marginBottom: '6px' }}>
                    {section.subtitle}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {section.fouls.map(f => (
                    <button
                      key={formatPlayerFoul(f)}
                      onClick={() => addPlayerFoul(f)}
                      title={`${section.title} · Penalidad: ${f.penalty || '—'}`}
                      style={{
                        padding: '8px 4px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: (pendingAction?.type === 'FOUL' && isSameFoul(pendingAction.value, f)) ? 'var(--fiba-yellow)' : '#fff',
                        color: '#333',
                        border: '1px solid var(--fiba-red)',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      className="action-btn"
                    >
                      {formatPlayerFoul(f)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
