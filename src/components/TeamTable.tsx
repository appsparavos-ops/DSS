import React from 'react';
import type { Player, PlayerFoul, CoachFoul, PlayerFoulType } from '../types';

interface TeamTableProps {
  teamName: string;
  color?: string;
  headCoach?: string;
  assistantCoach?: string;
  headCoachFouls?: CoachFoul[];
  assistantCoachFouls?: CoachFoul[];
  players: Player[];
  side: 'A' | 'B';
  onAddPoint: (playerId: string, points: number) => void;
  onAddFoul: (playerId: string, foulType: PlayerFoulType) => void;
  onAddCoachFoul: (role: 'HC' | 'AC', foulType: CoachFoul) => void;
  onToggleEntry: (playerId: string) => void;
}

const accentColor = (color?: string, side?: 'A' | 'B') =>
  color || (side === 'A' ? 'var(--fiba-yellow)' : 'var(--fiba-green)');

// Reglas de descalificación de JUGADOR
const isPlayerDisqualified = (fouls: PlayerFoul[]): boolean => {
  if (fouls.length >= 5) return true;
  if (fouls.some(f => f.type === 'D')) return true;
  const u = fouls.filter(f => f.type === 'U2').length;
  const t = fouls.filter(f => f.type === 'T1').length;
  if (u >= 2) return true;
  if (t >= 2) return true;
  if (t >= 1 && u >= 1) return true;
  return false;
};

// Reglas de descalificación de CUERPO TÉCNICO
const isHeadCoachDisqualified = (fouls: CoachFoul[]): boolean => {
  if (fouls.includes('D')) return true;
  const c = fouls.filter(f => f === 'C1').length;
  const b = fouls.filter(f => f === 'B1').length;
  if (c >= 2) return true;
  if (c + b >= 3) return true;
  return false;
};

const isAssistantCoachDisqualified = (fouls: CoachFoul[], isActingHC: boolean): boolean => {
  if (fouls.includes('D')) return true;
  if (isActingHC) {
    const c = fouls.filter(f => f === 'C1').length;
    const b = fouls.filter(f => f === 'B1').length;
    if (c >= 2) return true;
    if (c + b >= 3) return true;
  }
  return false;
};

const TeamTable: React.FC<TeamTableProps> = ({
  teamName, color, headCoach, assistantCoach, 
  headCoachFouls = [], assistantCoachFouls = [],
  players, side, onAddPoint, onAddFoul, onAddCoachFoul, onToggleEntry
}) => {
  
  const sortedPlayers = [...players].sort((a, b) => {
    const hasA = a.name.trim() || a.number.trim();
    const hasB = b.name.trim() || b.number.trim();
    if (!hasA && hasB) return 1;
    if (hasA && !hasB) return -1;
    if (!hasA && !hasB) return 0;
    const numA = parseInt(a.number) || 0;
    const numB = parseInt(b.number) || 0;
    return numA - numB;
  });

  const getFoulColor = (period: number) => {
    if (period === 1 || period === 3) return 'var(--fiba-red)';
    return 'var(--fiba-blue)';
  };

  return (
    <div className="premium-card animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{
        color: color || 'var(--fiba-blue)',
        borderBottom: `4px solid ${accentColor(color, side)}`,
        paddingBottom: '0.5rem',
        marginBottom: '0.75rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        fontSize: '1rem'
      }}>
        {teamName}
      </h3>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '34px' }} />
          <col />
          <col style={{ width: '24px' }} />
          <col style={{ width: '28px' }} />
          <col style={{ width: '132px' }} />
          <col style={{ width: '136px' }} />
        </colgroup>
        <tbody>
          {sortedPlayers.map((player) => {
            const disq = isPlayerDisqualified(player.fouls);
            const isEmpty = !player.name.trim() && !player.number.trim();

            if (isEmpty) {
              return (
                <tr key={player.id} style={{ height: '32px' }}>
                  <td colSpan={6} style={{ borderBottom: '1px solid #f9f9f9' }}></td>
                </tr>
              );
            }

            return (
              <tr key={player.id} style={{
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: disq ? '#fff0f0' : 'transparent',
                transition: 'background-color 0.3s'
              }}>
                <td style={{
                  padding: '0.28rem 0.2rem',
                  fontWeight: 800, fontSize: '0.82rem',
                  textAlign: 'center',
                  background: accentColor(color, side),
                  color: 'white',
                  borderRadius: '3px'
                }}>
                  {player.number}
                </td>
                <td style={{ 
                  padding: '0.28rem 0.4rem', 
                  fontWeight: 600, fontSize: '0.82rem',
                  color: disq ? 'var(--fiba-red)' : 'inherit',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {player.name}{player.isCaptain && ' (CAP)'}{disq && <span style={{ marginLeft: '4px', fontSize: '0.7rem' }}>D</span>}
                </td>
                <td style={{ padding: '0.28rem 0', textAlign: 'center' }}>
                  <div
                    onClick={() => onToggleEntry(player.id)}
                    style={{
                      width: '20px', height: '20px',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '0.75rem', fontWeight: 800,
                      color: player.hasEntered ? (player.isStarter ? 'var(--fiba-blue)' : '#555') : '#ddd',
                      borderRadius: player.isStarter && player.hasEntered ? '50%' : '3px',
                      border: player.isStarter && player.hasEntered ? '2px solid var(--fiba-blue)' : 'none',
                      userSelect: 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {player.hasEntered ? '✕' : ''}
                  </div>
                </td>
                <td style={{
                  padding: '0.28rem 0.2rem',
                  fontWeight: 700, fontSize: '0.92rem',
                  textAlign: 'center',
                  color: color || 'var(--fiba-blue)'
                }}>
                  {player.points || 0}
                </td>
                <td style={{ padding: '0.28rem 0.2rem' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const foul = player.fouls[i];
                      const uCount = player.fouls.filter(f => f.type === 'U2').length;
                      const tCount = player.fouls.filter(f => f.type === 'T1').length;
                      const isDoubleTU = uCount >= 2 || tCount >= 2 || (uCount >= 1 && tCount >= 1);
                      const hasD = player.fouls.some(f => f.type === 'D');
                      const has5Fouls = player.fouls.length >= 5;

                      let content = foul ? foul.type : '';
                      const lastFoul = player.fouls[player.fouls.length - 1];
                      let bgColor = foul ? getFoulColor(foul.period) : '#efefef';
                      
                      if (!foul && (isDoubleTU || hasD)) {
                        content = 'GD';
                        bgColor = lastFoul ? getFoulColor(lastFoul.period) : '#666';
                      } else if (i === 4 && has5Fouls) {
                        content = (foul?.type || '') + ' GD';
                      }

                      return (
                        <div key={i} style={{
                          width: '24px', height: '20px',
                          borderRadius: '3px',
                          backgroundColor: bgColor,
                          color: 'white', fontSize: '0.52rem',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontWeight: 700, flexShrink: 0,
                          padding: '0 2px'
                        }}>
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td style={{ padding: '0.28rem 0.2rem' }}>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <button onClick={() => onAddPoint(player.id, 1)} className="btn-small">+1</button>
                    <button onClick={() => onAddPoint(player.id, 2)} className="btn-small">+2</button>
                    <button onClick={() => onAddPoint(player.id, 3)} className="btn-small">+3</button>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          onAddFoul(player.id, e.target.value as PlayerFoulType);
                          e.target.value = '';
                        }
                      }}
                      style={{
                        padding: '3px 2px', fontSize: '0.75rem',
                        borderRadius: '4px', border: '1px solid var(--fiba-red)',
                        color: 'var(--fiba-red)', background: 'white',
                        cursor: 'pointer', width: '46px'
                      }}
                      value=""
                    >
                      <option value="" disabled>F▾</option>
                      <option value="P">P</option>
                      <option value="P1">P1</option>
                      <option value="P2">P2</option>
                      <option value="P3">P3</option>
                      <option value="U2">U2</option>
                      <option value="T1">T1</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {(() => {
        const hcDisq = !headCoach || isHeadCoachDisqualified(headCoachFouls);
        const acDisq = !assistantCoach || isAssistantCoachDisqualified(assistantCoachFouls, hcDisq);
        const captain = players.find(p => p.isCaptain);
        
        return (
          <div style={{
            marginTop: '0.75rem',
            paddingTop: '0.6rem',
            borderTop: `2px solid ${accentColor(color, side)}`,
            fontSize: '0.8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            {headCoach && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                backgroundColor: isHeadCoachDisqualified(headCoachFouls) ? '#fff0f0' : 'transparent',
                borderRadius: '4px', padding: '2px 4px'
              }}>
                <span style={{
                  minWidth: '26px', fontWeight: 700, fontSize: '0.68rem',
                  color: 'white',
                  background: isHeadCoachDisqualified(headCoachFouls) ? 'var(--fiba-red)' : accentColor(color, side),
                  borderRadius: '3px', padding: '1px 4px', textAlign: 'center'
                }}>HC</span>
                <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: isHeadCoachDisqualified(headCoachFouls) ? 'var(--fiba-red)' : 'inherit'
                }}>
                  {headCoach}{isHeadCoachDisqualified(headCoachFouls) && <span style={{ marginLeft: '4px', fontSize: '0.7rem' }}>D</span>}
                </span>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexShrink: 0 }}>
                  {headCoachFouls.map((f, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '22px', height: '18px', borderRadius: '3px',
                      background: 'var(--fiba-red)', color: 'white', fontSize: '0.62rem', fontWeight: 700
                    }}>{f}</span>
                  ))}
                  {!isHeadCoachDisqualified(headCoachFouls) && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button onClick={() => onAddCoachFoul('HC', 'C1')} style={{ padding: '2px 5px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--fiba-red)', color: 'var(--fiba-red)', background: 'white', cursor: 'pointer', fontWeight: 700 }}>+C1</button>
                      <button onClick={() => onAddCoachFoul('HC', 'B1')} style={{ padding: '2px 5px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--fiba-red)', color: 'var(--fiba-red)', background: 'white', cursor: 'pointer', fontWeight: 700 }}>+B1</button>
                      <button onClick={() => onAddCoachFoul('HC', 'D')} style={{ padding: '2px 5px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--fiba-red)', color: 'white', background: 'var(--fiba-red)', cursor: 'pointer', fontWeight: 700 }}>+D</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {assistantCoach && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                backgroundColor: isAssistantCoachDisqualified(assistantCoachFouls, hcDisq) ? '#fff0f0' : 'transparent',
                borderRadius: '4px', padding: '2px 4px'
              }}>
                <span style={{
                  minWidth: '26px', fontWeight: 700, fontSize: '0.68rem',
                  color: 'white', background: isAssistantCoachDisqualified(assistantCoachFouls, hcDisq) ? 'var(--fiba-red)' : 'var(--text-muted)',
                  borderRadius: '3px', padding: '1px 4px', textAlign: 'center'
                }}>AC</span>
                <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: isAssistantCoachDisqualified(assistantCoachFouls, hcDisq) ? 'var(--fiba-red)' : 'inherit'
                }}>
                  {assistantCoach}{isAssistantCoachDisqualified(assistantCoachFouls, hcDisq) && <span style={{ marginLeft: '4px', fontSize: '0.7rem' }}>D</span>}
                </span>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexShrink: 0 }}>
                  {assistantCoachFouls.map((f, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '22px', height: '18px', borderRadius: '3px',
                      background: 'var(--fiba-red)', color: 'white', fontSize: '0.62rem', fontWeight: 700
                    }}>{f}</span>
                  ))}
                  {!isAssistantCoachDisqualified(assistantCoachFouls, hcDisq) && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {hcDisq && (
                        <>
                          <button onClick={() => onAddCoachFoul('AC', 'C1')} style={{ padding: '2px 5px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--fiba-red)', color: 'var(--fiba-red)', background: 'white', cursor: 'pointer', fontWeight: 700 }}>+C1</button>
                          <button onClick={() => onAddCoachFoul('AC', 'B1')} style={{ padding: '2px 5px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--fiba-red)', color: 'var(--fiba-red)', background: 'white', cursor: 'pointer', fontWeight: 700 }}>+B1</button>
                        </>
                      )}
                      <button onClick={() => onAddCoachFoul('AC', 'D')} style={{ padding: '2px 5px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--fiba-red)', color: 'white', background: 'var(--fiba-red)', cursor: 'pointer', fontWeight: 700 }}>+D</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {hcDisq && acDisq && captain && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                backgroundColor: '#fffbe6', borderRadius: '4px', padding: '4px 8px',
                border: '1px dashed var(--fiba-yellow)', marginTop: '4px'
              }}>
                <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, color: '#856404' }}>
                  RESPONSABLE: CAPITÁN ({captain.number})
                </span>
                <button 
                  onClick={() => onAddFoul(captain.id, 'T1')}
                  style={{
                    padding: '2px 8px', fontSize: '0.7rem', borderRadius: '4px',
                    border: '1px solid var(--fiba-red)', color: 'var(--fiba-red)',
                    background: 'white', cursor: 'pointer', fontWeight: 700
                  }}
                >+TC (AL CAPITÁN)</button>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default TeamTable;
