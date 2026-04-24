import { useState, useMemo } from 'react';
import type { GameEvent, GameState } from '../types';

interface HistoryPanelProps {
  state: GameState;
  onDeleteEvent: (id: string) => void;
  onUpdateEvent: (id: string, updates: Partial<GameEvent>) => void;
}

const HistoryPanel = ({ state, onDeleteEvent, onUpdateEvent }: HistoryPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterTeam, setFilterTeam] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [filterPlayer, setFilterPlayer] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filtrado de eventos
  const filteredEvents = useMemo(() => {
    return state.history.filter(event => {
      const teamMatch = filterTeam === 'ALL' || event.teamSide === filterTeam;
      const playerMatch = filterPlayer === 'ALL' || event.playerId === filterPlayer;
      const typeMatch = filterType === 'ALL' || 
                       (filterType === 'POINTS' && event.type.startsWith('POINT')) ||
                       (filterType === 'FOULS' && event.type === 'FOUL') ||
                       (filterType === 'TIMEOUT' && event.type === 'TIMEOUT') ||
                       (filterType === 'HCC' && event.type === 'HCC');
      
      return teamMatch && playerMatch && typeMatch;
    });
  }, [state.history, filterTeam, filterPlayer, filterType]);

  // Jugadores disponibles para el filtro (basado en el equipo)
  const availablePlayers = useMemo(() => {
    if (filterTeam === 'A') return state.teamA.players.filter(p => p.name || p.number);
    if (filterTeam === 'B') return state.teamB.players.filter(p => p.name || p.number);
    return [];
  }, [state.teamA.players, state.teamB.players, filterTeam]);

  const getEventBadgeColor = (type: string, period: number) => {
    if (type.startsWith('POINT')) return '#4caf50';
    if (type === 'FOUL') return '#f44336';
    if (type === 'TIMEOUT') {
      return (period === 1 || period === 3) ? '#c80000' : '#0000b4';
    }
    if (type === 'HCC') return '#3f51b5';
    return '#666';
  };

  return (
    <section className="premium-card animate-fade-in" style={{ marginTop: '2rem' }}>
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 style={{ color: 'var(--fiba-blue)', margin: 0 }}>📜 HISTORIAL DE ACCIONES {isExpanded ? '▲' : '▼'}</h3>
        <span style={{ fontSize: '0.8rem', background: '#eee', padding: '2px 8px', borderRadius: '12px' }}>
          {filteredEvents.length} eventos
        </span>
      </div>

      {isExpanded && (
        <>
          {/* Barra de Filtros */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#888', marginBottom: '4px' }}>EQUIPO</label>
              <select value={filterTeam} onChange={(e) => { setFilterTeam(e.target.value as any); setFilterPlayer('ALL'); }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}>
                <option value="ALL">TODOS</option>
                <option value="A">{state.teamA.name}</option>
                <option value="B">{state.teamB.name}</option>
              </select>
            </div>

            {filterTeam !== 'ALL' && (
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#888', marginBottom: '4px' }}>JUGADOR</label>
                <select value={filterPlayer} onChange={(e) => setFilterPlayer(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <option value="ALL">TODOS</option>
                  {availablePlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.number} - {p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#888', marginBottom: '4px' }}>TIPO DE ACCIÓN</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}>
                <option value="ALL">TODAS</option>
                <option value="POINTS">PUNTOS</option>
                <option value="FOULS">FALTAS</option>
                <option value="TIMEOUT">TIEMPOS MUERTOS</option>
                <option value="HCC">HCC</option>
              </select>
            </div>
          </div>

          {/* Tabla de Eventos */}
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '10px' }}>TIEMPO</th>
                  <th>EQUIPO</th>
                  <th>ACCIÓN</th>
                  <th>Nº</th>
                  <th>JUGADOR</th>
                  <th style={{ textAlign: 'right', padding: '10px' }}>OPERACIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(event => {
                  const isEditing = editingId === event.id;
                  const team = event.teamSide === 'A' ? state.teamA : state.teamB;
                  const player = team.players.find(p => p.id === event.playerId);

                  return (
                    <tr key={event.id} className="history-row" style={{ borderBottom: '1px solid #f5f5f5', transition: 'background 0.2s' }}>
                      <td style={{ padding: '10px', color: '#666', fontWeight: 600 }}>
                        P{event.period} {event.timeRemaining}
                      </td>
                      <td style={{ fontWeight: 700, color: event.teamSide === 'A' ? state.teamA.color : state.teamB.color }}>
                        {isEditing ? (
                          <select 
                            value={event.teamSide}
                            onChange={(e) => onUpdateEvent(event.id, { teamSide: e.target.value as 'A' | 'B', playerId: undefined })}
                            style={{ padding: '4px', fontSize: '0.8rem', width: '100px' }}
                          >
                            <option value="A">{state.teamA.name}</option>
                            <option value="B">{state.teamB.name}</option>
                          </select>
                        ) : (
                          team.name
                        )}
                      </td>
                      <td>
                        {isEditing && event.type.startsWith('POINT') ? (
                          <select 
                            value={event.type} 
                            onChange={(e) => {
                              const newType = e.target.value as any;
                              const desc = newType === 'POINT1' ? 'Tiro Libre anotado' : newType === 'POINT2' ? 'Canasta de 2 pts' : 'Triple anotado';
                              onUpdateEvent(event.id, { type: newType, description: desc });
                            }}
                            style={{ padding: '4px', fontSize: '0.8rem' }}
                          >
                            <option value="POINT1">1 PUNTO</option>
                            <option value="POINT2">2 PUNTOS</option>
                            <option value="POINT3">3 PUNTOS</option>
                          </select>
                        ) : (
                          <span style={{ 
                            background: getEventBadgeColor(event.type, event.period), 
                            color: 'white', 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }}>
                            {event.description.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td>
                        {isEditing && (event.type.startsWith('POINT') || (event.type === 'FOUL' && event.playerId !== 'HC' && event.playerId !== 'AC')) ? (
                          <select 
                            value={event.playerId || ''} 
                            onChange={(e) => onUpdateEvent(event.id, { playerId: e.target.value })}
                            style={{ padding: '4px', fontSize: '0.8rem' }}
                          >
                            <option value="">--</option>
                            {team.players.filter(p => p.name || p.number).map(p => (
                              <option key={p.id} value={p.id}>{p.number}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontWeight: 800 }}>{player?.number || '-'}</span>
                        )}
                      </td>
                      <td style={{ color: '#444' }}>
                        {player?.name || '-'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => setEditingId(isEditing ? null : event.id)}
                            className="btn-icon"
                            style={{ background: isEditing ? 'var(--fiba-blue)' : '#f0f0f0', color: isEditing ? 'white' : '#666' }}
                            title="Editar acción"
                          >
                            {isEditing ? '✓' : '✏️'}
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm('¿Eliminar esta acción? El marcador se actualizará.')) {
                                onDeleteEvent(event.id);
                              }
                            }}
                            className="btn-icon"
                            style={{ background: '#fff0f0', color: '#ff4444' }}
                            title="Eliminar acción"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredEvents.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
                <p>No se encontraron eventos con los filtros seleccionados.</p>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .history-row:hover { background: #fcfcfc; }
        .btn-icon {
          width: 30px; height: 30px; border-radius: 6px; border: none; cursor: pointer;
          display: flex; alignItems: center; justifyContent: center; transition: all 0.2s;
        }
        .btn-icon:hover { transform: translateY(-2px); filter: brightness(0.9); }
      `}</style>
    </section>
  );
};

export default HistoryPanel;
