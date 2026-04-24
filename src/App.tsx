import { useState, useEffect, useCallback } from 'react';
import { useGame } from './hooks/useGame';
import Scoreboard from './components/Scoreboard';
import SetupScreen from './components/SetupScreen';
import HistoryPanel from './components/HistoryPanel';
import CompactTeamList from './components/CompactTeamList';
import ActionPanel from './components/ActionPanel';
import { generatePDF } from './utils/pdfGenerator';
import type { PlayerFoulType, CoachFoul, PendingAction } from './types';

function App() {
  const { 
    state, 
    savedGames,
    toggleTimer, 
    addPoint, 
    addFoul,
    addCoachFoul, 
    nextPeriod, 
    resetGame,
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
    updateGameInfo,
    startGame,
    goToSetup,
    deleteEvent,
    updateEvent,
    saveGameToLibrary,
    loadGameFromLibrary,
    deleteFromLibrary,
    finishGame,
    setTeamPlayers,
    exportGameToFile,
    importGameFromFile,
  } = useGame();

  // Estados locales para UI
  const [showGameInfo, setShowGameInfo] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<{
    side: 'A' | 'B';
    type: 'PLAYER' | 'COACH';
    id?: string;
    role?: 'HC' | 'AC';
  } | null>(null);

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [confirmation, setConfirmation] = useState<{
    message: string;
    onAccept: () => void;
  } | null>(null);

  const requestConfirmation = (message: string, onAccept: () => void) => {
    setConfirmation({ message, onAccept });
  };

  const isCoachAvailable = (side: 'A' | 'B') => {
    const team = side === 'A' ? state.teamA : state.teamB;
    if (!team.headCoach && !team.assistantCoach) return false;
    
    // Reglas de descalificación HC
    const hc_c = team.headCoachFouls.filter(f => f === 'C1').length;
    const hc_total = team.headCoachFouls.length;
    const hc_d = team.headCoachFouls.some(f => f === 'D' || f === 'D2');
    const isHCDisq = hc_d || hc_c >= 2 || hc_total >= 3;

    // Reglas AC
    const ac_d = team.assistantCoachFouls.some(f => f === 'D' || f === 'D2');
    const isACDisq = ac_d;

    return !isHCDisq || (!!team.assistantCoach && !isACDisq);
  };

  const selectedTeam = selectedTarget?.side === 'A' ? state.teamA : state.teamB;
  const selectedPlayer = selectedTarget?.type === 'PLAYER' ? selectedTeam.players.find(p => p.id === selectedTarget.id) : null;

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || showGameInfo || showLibrary || isSaving) return;
      if (state.status !== 'PLAYING') return;
      if (e.key === 'Tab' || e.key === ' ') {
        e.preventDefault(); e.stopPropagation();
        toggleTimer();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); adjustTimer(1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault(); adjustTimer(-1);
      } else if (e.key === 'Escape') {
        setSelectedTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [toggleTimer, state.status, showGameInfo, showLibrary, isSaving]);

  const handleAction = useCallback((action: () => void) => {
    action();
    setSelectedTarget(null);
    setPendingAction(null);
  }, []);

  const getSelectedName = () => {
    if (!selectedTarget) return '';
    const team = selectedTarget.side === 'A' ? state.teamA : state.teamB;
    if (selectedTarget.type === 'COACH') {
      return selectedTarget.role === 'HC' ? `HC: ${team.headCoach}` : `AC: ${team.assistantCoach}`;
    }
    const player = team.players.find(p => p.id === selectedTarget.id);
    return player ? player.name : '';
  };

  const renderGameInfoModal = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 3000, padding: '1rem'
    }}>
      <div className="premium-card animate-scale-in" style={{ width: '600px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--fiba-blue)' }}>📋 Detalles del Partido y Oficiales</h3>
          <button onClick={() => setShowGameInfo(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label>Competición</label>
            <input type="text" value={state.competition} onChange={(e) => updateGameInfo({ competition: e.target.value.toUpperCase() })} />
          </div>
          <div className="form-group">
            <label>Sede / Lugar</label>
            <input type="text" value={state.venue} onChange={(e) => updateGameInfo({ venue: e.target.value.toUpperCase() })} />
          </div>
          <div className="form-group">
            <label>Fecha</label>
            <input type="text" value={state.date} onChange={(e) => updateGameInfo({ date: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Hora Inicio</label>
            <input type="text" value={state.timeStart} onChange={(e) => updateGameInfo({ timeStart: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}><hr style={{ opacity: 0.1 }} /></div>
          <div className="form-group"><label>Crew Chief</label><input type="text" value={state.crewChief} onChange={(e) => updateGameInfo({ crewChief: e.target.value.toUpperCase() })} /></div>
          <div className="form-group"><label>Umpire 1</label><input type="text" value={state.umpire1} onChange={(e) => updateGameInfo({ umpire1: e.target.value.toUpperCase() })} /></div>
          <div className="form-group"><label>Umpire 2</label><input type="text" value={state.umpire2} onChange={(e) => updateGameInfo({ umpire2: e.target.value.toUpperCase() })} /></div>
          <div style={{ gridColumn: '1 / -1' }}><hr style={{ opacity: 0.1 }} /></div>
          <div className="form-group"><label>Anotador</label><input type="text" value={state.scorer} onChange={(e) => updateGameInfo({ scorer: e.target.value.toUpperCase() })} /></div>
          <div className="form-group"><label>Cronometrista</label><input type="text" value={state.timerOfficial} onChange={(e) => updateGameInfo({ timerOfficial: e.target.value.toUpperCase() })} /></div>
          <div className="form-group"><label>Operador 24"</label><input type="text" value={state.shotClockOperator} onChange={(e) => updateGameInfo({ shotClockOperator: e.target.value.toUpperCase() })} /></div>
        </div>
        <button onClick={() => setShowGameInfo(false)} className="btn-primary" style={{ width: '100%', marginTop: '2rem' }}>GUARDAR CAMBIOS</button>
      </div>
    </div>
  );

  const renderSaveModal = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
      <div className="premium-card animate-scale-in" style={{ width: '400px' }}>
        <h3 style={{ color: 'var(--fiba-blue)', marginTop: 0 }}>💾 Guardar como Plantilla</h3>
        <p style={{ fontSize: '0.8rem', color: '#666' }}>Asigna un nombre para identificar este partido en el futuro.</p>
        <input 
          autoFocus
          type="text" 
          value={saveName} 
          onChange={(e) => setSaveName(e.target.value)} 
          placeholder="Ej: Final Sub-18 vs Nacional"
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #eee', marginBottom: '1.5rem', fontSize: '1rem' }}
        />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => setIsSaving(false)} style={{ flex: 1, padding: '10px', background: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>CANCELAR</button>
          <button onClick={() => { saveGameToLibrary(saveName); setIsSaving(false); setSaveName(''); }} style={{ flex: 1, padding: '10px', background: 'var(--fiba-blue)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>GUARDAR</button>
        </div>
      </div>
    </div>
  );

  const renderHistoryModal = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 3000, padding: '1rem'
    }}>
      <div className="premium-card animate-scale-in" style={{ width: '900px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #eee', paddingBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--fiba-blue)' }}>🕒 Historial del Partido</h3>
          <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ flex: 1 }}>
          <HistoryPanel state={state} onDeleteEvent={deleteEvent} onUpdateEvent={updateEvent} />
        </div>
      </div>
    </div>
  );

  const renderLibraryModal = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
      <div className="premium-card animate-scale-in" style={{ width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--fiba-blue)' }}>📚 Biblioteca de Partidos</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={importGameFromFile} style={{ background: 'var(--fiba-blue)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>📂 IMPORTAR</button>
            <button onClick={() => setShowLibrary(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
          </div>
        </div>
        
        {savedGames.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
            <p style={{ fontSize: '3rem', margin: 0 }}>📂</p>
            <p>No tienes partidos guardados aún.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {savedGames.map(game => (
              <div key={game.id} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfc' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--fiba-blue)' }}>{game.name}</div>
                  <div style={{ fontSize: '0.7rem', color: '#999' }}>Guardado: {game.date}</div>
                </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => { if(window.confirm('¿Cargar este partido? Se perderá el progreso actual.')) { loadGameFromLibrary(game.data); setShowLibrary(false); } }}
                      style={{ background: 'var(--fiba-green)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                    >CARGAR</button>
                    <button 
                      onClick={async () => {
                        // Cargar temporalmente para exportar el estado actual
                        await exportGameToFile(game.name);
                      }}
                      style={{ background: '#eee', color: '#333', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                      title="Exportar a archivo"
                    >💾</button>
                    <button 
                      onClick={() => deleteFromLibrary(game.id)}
                      style={{ background: '#fff0f0', color: '#ff4444', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >🗑️</button>
                  </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setShowLibrary(false)} style={{ width: '100%', marginTop: '2rem', padding: '12px', background: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>CERRAR</button>
      </div>
    </div>
  );

  if (state.status === 'SETUP') {
    return (
      <div style={{ maxWidth: '98%', margin: '0 auto', padding: '1rem' }}>
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'var(--fiba-blue)', fontWeight: 700, fontSize: '1.5rem' }}>FIBA DIGITAL SCORE SHEET</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configuración de Encuentro</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setShowLibrary(true)} style={{ background: 'var(--fiba-yellow)', color: '#333' }} className="btn-primary">📚 BIBLIOTECA</button>
            <button onClick={() => setIsSaving(true)} style={{ background: '#eee', color: '#333' }} className="btn-primary">💾 GUARDAR</button>
            <button onClick={() => setShowGameInfo(true)} style={{ background: 'var(--fiba-blue)', color: 'white' }} className="btn-primary">📋 OFICIALES</button>
            <button onClick={resetGame} style={{ background: '#fff0f0', color: '#ff4444' }} className="btn-primary">REINICIAR</button>
          </div>
        </header>
        <SetupScreen teamA={state.teamA} teamB={state.teamB} onUpdateTeamName={updateTeamName} onUpdateTeamColor={updateTeamColor} onUpdateTeamTextColor={updateTeamTextColor} onUpdateTeamCoach={updateTeamCoach} onUpdateTeamLogo={updateTeamLogo} onUpdatePlayer={updatePlayer} onSetTeamPlayers={setTeamPlayers} onStartGame={startGame} />
        {showGameInfo && renderGameInfoModal()}
        {isSaving && renderSaveModal()}
        {showLibrary && renderLibraryModal()}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100vw', margin: '0 auto', padding: '0.5rem 1rem', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1 style={{ color: 'var(--fiba-blue)', fontWeight: 700, fontSize: '1.5rem', margin: 0 }}>FIBA DIGITAL SCORE SHEET</h1><p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Planilla de Juego Oficial</p></div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => setShowGameInfo(true)} className="btn-primary" style={{ background: '#eee', color: '#333' }}>📋</button>
          <button onClick={() => generatePDF(state)} style={{ background: 'var(--fiba-green)', color: 'white' }} className="btn-primary">ACTA (PDF)</button>
          
          {state.status === 'FINISHED' ? (
            <div style={{ background: '#333', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600 }}>PARTIDO FINALIZADO</div>
          ) : state.period >= 4 ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => {
                  if (state.teamA.score === state.teamB.score) {
                    alert('El partido está empatado. No se puede finalizar sin jugar una prórroga.');
                  } else {
                    if (window.confirm('¿Estás seguro de finalizar el partido? Se cerrará el acta.')) {
                      finishGame();
                    }
                  }
                }} 
                style={{ background: '#d32f2f', color: 'white' }} className="btn-primary"
              >
                FINALIZAR PARTIDO
              </button>
              <button onClick={nextPeriod} className="btn-primary" style={{ background: '#1976d2', color: 'white' }}>
                JUGAR PRÓRROGA
              </button>
            </div>
          ) : (
            <button onClick={nextPeriod} className="btn-primary">SIGUIENTE PERIODO</button>
          )}
          <button onClick={() => exportGameToFile()} style={{ background: '#eee', color: '#333' }} className="btn-primary" title="Exportar partido a archivo JSON">💾</button>
          <button onClick={goToSetup} style={{ background: 'var(--fiba-yellow)', color: '#333' }} className="btn-primary">✏️ EDITAR</button>
        </div>
      </header>

      <main>
        <Scoreboard 
          teamAName={state.teamA.name} teamBName={state.teamB.name} 
          logoA={state.teamA.logo} logoB={state.teamB.logo} 
          teamAColor={state.teamA.color} teamATextColor={state.teamA.textColor}
          teamBColor={state.teamB.color} teamBTextColor={state.teamB.textColor}
          scoreA={state.teamA.score} scoreB={state.teamB.score} 
          teamAFouls={state.teamA.foulsPerPeriod[Math.min(state.period-1, 3)]} 
          teamBFouls={state.teamB.foulsPerPeriod[Math.min(state.period-1, 3)]} 
          timeoutsA={state.teamA.timeouts} timeoutsB={state.teamB.timeouts} 
          period={state.period} timer={state.timer} isRunning={state.isRunning} 
          onToggleTimer={toggleTimer} onAddTimeout={addTimeout} 
          activeTimeout={state.activeTimeout}
          onCancelTimeout={cancelTimeout}
        />
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* LADO A */}
          <CompactTeamList 
            teamName={state.teamA.name} players={state.teamA.players} side="A" color={state.teamA.color} textColor={state.teamA.textColor}
            selectedPlayerId={selectedTarget?.side === 'A' && selectedTarget.type === 'PLAYER' ? selectedTarget.id : undefined}
            onSelectPlayer={(id) => {
              if (pendingAction && (pendingAction.type === 'POINT' || pendingAction.type === 'FOUL' || pendingAction.type === 'ENTRY')) {
                const player = state.teamA.players.find(p => p.id === id);
                if (pendingAction.type === 'POINT') {
                  const needsEntry = player && !player.hasEntered && !player.isStarter;
                  const msg = needsEntry 
                    ? `${player.name} no ha ingresado. ¿Registrar entrada y sumar +${pendingAction.value} puntos?`
                    : `+${pendingAction.value} puntos para ${player?.name} (${state.teamA.name})`;
                  requestConfirmation(msg, () => {
                    if (needsEntry) togglePlayerEntry('A', id);
                    handleAction(() => addPoint('A', id, pendingAction.value));
                  });
                } else if (pendingAction.type === 'FOUL') {
                  const needsEntry = player && !player.hasEntered && !player.isStarter;
                  const msg = needsEntry 
                    ? `${player.name} no ha ingresado. ¿Registrar entrada y marcar falta ${pendingAction.value}?`
                    : `Falta ${pendingAction.value} para ${player?.name} (${state.teamA.name})`;
                  requestConfirmation(msg, () => {
                    if (needsEntry) togglePlayerEntry('A', id);
                    handleAction(() => addFoul('A', id, pendingAction.value));
                  });
                } else if (pendingAction.type === 'ENTRY') {
                  requestConfirmation(`Cambio/Entrada para ${player?.name} (${state.teamA.name})`, () => { togglePlayerEntry('A', id); setPendingAction(null); });
                }
              } else if (pendingAction?.type === 'TIMEOUT') {
                return;
              } else {
                const isAlreadySelected = selectedTarget?.side === 'A' && selectedTarget.type === 'PLAYER' && selectedTarget.id === id;
                if (isAlreadySelected) {
                  setSelectedTarget(null);
                } else {
                  const player = state.teamA.players.find(p => p.id === id);
                  setSelectedTarget({ side: 'A', type: 'PLAYER', id });
                  setPendingAction(null);
                  if (player && !player.hasEntered && !player.isStarter) {
                    requestConfirmation(
                      `${player.name} no ha ingresado al partido. ¿Registrar su entrada?`,
                      () => { togglePlayerEntry('A', id); }
                    );
                  }
                }
              }
            }}
            headCoach={state.teamA.headCoach} assistantCoach={state.teamA.assistantCoach}
            headCoachFouls={state.teamA.headCoachFouls} assistantCoachFouls={state.teamA.assistantCoachFouls}
            onSelectCoach={(role) => {
              if (pendingAction && (pendingAction.type === 'FOUL' || pendingAction.type === 'HCC' || pendingAction.type === 'TIMEOUT')) {
                const name = role === 'HC' ? state.teamA.headCoach : state.teamA.assistantCoach;
                if (pendingAction.type === 'FOUL') {
                  requestConfirmation(`Falta ${pendingAction.value} para ${role}: ${name} (${state.teamA.name})`, () => handleAction(() => addCoachFoul('A', role, pendingAction.value)));
                } else if (pendingAction.type === 'HCC') {
                  requestConfirmation(`HCC para ${state.teamA.name}`, () => handleAction(() => addHCC('A')));
                } else if (pendingAction.type === 'TIMEOUT') {
                  requestConfirmation(`Tiempo Muerto para ${state.teamA.name}`, () => handleAction(() => addTimeout('A')));
                }
              } else {
                const isAlreadySelected = selectedTarget?.side === 'A' && selectedTarget.type === 'COACH' && selectedTarget.role === role;
                setSelectedTarget(isAlreadySelected ? null : { side: 'A', type: 'COACH', role });
                setPendingAction(null);
              }
            }}
            selectedCoachRole={selectedTarget?.side === 'A' && selectedTarget.type === 'COACH' ? selectedTarget.role : null}
            hcc={state.teamA.hcc}
          />

          {/* PANEL CENTRAL */}
          <ActionPanel 
            selectedPlayerName={getSelectedName()}
            selectedSide={selectedTarget?.side}
            isCoachSelected={selectedTarget?.type === 'COACH'}
            selectedTargetType={selectedTarget?.type}
            disabled={state.status !== 'PLAYING'}
            pendingAction={pendingAction}
            selectedPlayerNumber={selectedPlayer?.number}
            selectedTeamColor={selectedTarget?.side === 'A' ? state.teamA.color : (selectedTarget?.side === 'B' ? state.teamB.color : undefined)}
            selectedTeamTextColor={selectedTarget?.side === 'A' ? state.teamA.textColor : (selectedTarget?.side === 'B' ? state.teamB.textColor : undefined)}
            isSelectedPlayerCaptain={selectedPlayer?.isCaptain || false}
            canRequestTimeout={selectedTarget ? !isCoachAvailable(selectedTarget.side) : false}
            onOpenHistory={() => setShowHistoryModal(true)}
            onAddPoint={(pts) => {
              if (selectedTarget?.type === 'PLAYER') {
                const team = selectedTarget.side === 'A' ? state.teamA : state.teamB;
                const player = team.players.find(p => p.id === selectedTarget.id);
                requestConfirmation(`+${pts} puntos para ${player?.name} (${team.name})`, () => handleAction(() => addPoint(selectedTarget.side, selectedTarget.id!, pts)));
              } else {
                setPendingAction(prev => (prev?.type === 'POINT' && prev.value === pts) ? null : { type: 'POINT', value: pts });
              }
            }}
            onAddFoul={(type: PlayerFoulType) => {
              const team = selectedTarget?.side === 'A' ? state.teamA : state.teamB;
              if (selectedTarget?.type === 'PLAYER') {
                const player = team.players.find(p => p.id === selectedTarget.id);
                requestConfirmation(`Falta ${type} para ${player?.name} (${team.name})`, () => handleAction(() => addFoul(selectedTarget.side, selectedTarget.id!, type)));
              } else if (selectedTarget?.type === 'COACH') {
                const name = selectedTarget.role === 'HC' ? team.headCoach : team.assistantCoach;
                requestConfirmation(`Falta ${type} para ${selectedTarget.role}: ${name} (${team.name})`, () => handleAction(() => addCoachFoul(selectedTarget.side, selectedTarget.role!, type as any)));
              } else {
                setPendingAction(prev => (prev?.type === 'FOUL' && prev.value === type) ? null : { type: 'FOUL', value: type });
              }
            }}
            onAddCoachFoul={(type: CoachFoul) => {
              const team = selectedTarget?.side === 'A' ? state.teamA : state.teamB;
              if (selectedTarget?.type === 'COACH') {
                const name = selectedTarget.role === 'HC' ? team.headCoach : team.assistantCoach;
                requestConfirmation(`Falta ${type} para ${selectedTarget.role}: ${name} (${team.name})`, () => handleAction(() => addCoachFoul(selectedTarget.side, selectedTarget.role!, type)));
              } else {
                setPendingAction(prev => (prev?.type === 'FOUL' && prev.value === type) ? null : { type: 'FOUL', value: type });
              }
            }}
            onAddTimeout={() => {
              const team = selectedTarget?.side === 'A' ? state.teamA : state.teamB;
              if (selectedTarget) {
                requestConfirmation(`Tiempo Muerto para ${team.name}`, () => handleAction(() => addTimeout(selectedTarget.side)));
              } else {
                setPendingAction(prev => prev?.type === 'TIMEOUT' ? null : { type: 'TIMEOUT' });
              }
            }}
            onAddHCC={() => {
              const team = selectedTarget?.side === 'A' ? state.teamA : state.teamB;
              if (selectedTarget?.type === 'COACH') {
                requestConfirmation(`HCC para ${team.name}`, () => handleAction(() => addHCC(selectedTarget.side)));
              } else {
                setPendingAction(prev => prev?.type === 'HCC' ? null : { type: 'HCC' });
              }
            }}
          />

          {/* LADO B */}
          <CompactTeamList 
            teamName={state.teamB.name} players={state.teamB.players} side="B" color={state.teamB.color} textColor={state.teamB.textColor}
            selectedPlayerId={selectedTarget?.side === 'B' && selectedTarget.type === 'PLAYER' ? selectedTarget.id : undefined}
            onSelectPlayer={(id) => {
              if (pendingAction && (pendingAction.type === 'POINT' || pendingAction.type === 'FOUL' || pendingAction.type === 'ENTRY')) {
                const player = state.teamB.players.find(p => p.id === id);
                if (pendingAction.type === 'POINT') {
                  const needsEntry = player && !player.hasEntered && !player.isStarter;
                  const msg = needsEntry 
                    ? `${player.name} no ha ingresado. ¿Registrar entrada y sumar +${pendingAction.value} puntos?`
                    : `+${pendingAction.value} puntos para ${player?.name} (${state.teamB.name})`;
                  requestConfirmation(msg, () => {
                    if (needsEntry) togglePlayerEntry('B', id);
                    handleAction(() => addPoint('B', id, pendingAction.value));
                  });
                } else if (pendingAction.type === 'FOUL') {
                  const needsEntry = player && !player.hasEntered && !player.isStarter;
                  const msg = needsEntry 
                    ? `${player.name} no ha ingresado. ¿Registrar entrada y marcar falta ${pendingAction.value}?`
                    : `Falta ${pendingAction.value} para ${player?.name} (${state.teamB.name})`;
                  requestConfirmation(msg, () => {
                    if (needsEntry) togglePlayerEntry('B', id);
                    handleAction(() => addFoul('B', id, pendingAction.value));
                  });
                } else if (pendingAction.type === 'ENTRY') {
                  requestConfirmation(`Cambio/Entrada para ${player?.name} (${state.teamB.name})`, () => { togglePlayerEntry('B', id); setPendingAction(null); });
                }
              } else if (pendingAction?.type === 'TIMEOUT') {
                return;
              } else {
                const isAlreadySelected = selectedTarget?.side === 'B' && selectedTarget.type === 'PLAYER' && selectedTarget.id === id;
                if (isAlreadySelected) {
                  setSelectedTarget(null);
                } else {
                  const player = state.teamB.players.find(p => p.id === id);
                  setSelectedTarget({ side: 'B', type: 'PLAYER', id });
                  setPendingAction(null);
                  if (player && !player.hasEntered && !player.isStarter) {
                    requestConfirmation(
                      `${player.name} no ha ingresado al partido. ¿Registrar su entrada?`,
                      () => { togglePlayerEntry('B', id); }
                    );
                  }
                }
              }
            }}
            headCoach={state.teamB.headCoach} assistantCoach={state.teamB.assistantCoach}
            headCoachFouls={state.teamB.headCoachFouls} assistantCoachFouls={state.teamB.assistantCoachFouls}
            onSelectCoach={(role) => {
              if (pendingAction && (pendingAction.type === 'FOUL' || pendingAction.type === 'HCC' || pendingAction.type === 'TIMEOUT')) {
                const name = role === 'HC' ? state.teamB.headCoach : state.teamB.assistantCoach;
                if (pendingAction.type === 'FOUL') {
                  requestConfirmation(`Falta ${pendingAction.value} para ${role}: ${name} (${state.teamB.name})`, () => handleAction(() => addCoachFoul('B', role, pendingAction.value)));
                } else if (pendingAction.type === 'HCC') {
                  requestConfirmation(`HCC para ${state.teamB.name}`, () => handleAction(() => addHCC('B')));
                } else if (pendingAction.type === 'TIMEOUT') {
                  requestConfirmation(`Tiempo Muerto para ${state.teamB.name}`, () => handleAction(() => addTimeout('B')));
                }
              } else {
                const isAlreadySelected = selectedTarget?.side === 'B' && selectedTarget.type === 'COACH' && selectedTarget.role === role;
                setSelectedTarget(isAlreadySelected ? null : { side: 'B', type: 'COACH', role });
                setPendingAction(null);
              }
            }}
            selectedCoachRole={selectedTarget?.side === 'B' && selectedTarget.type === 'COACH' ? selectedTarget.role : null}
            hcc={state.teamB.hcc}
          />
        </div>

        {showGameInfo && renderGameInfoModal()}
        {showHistoryModal && renderHistoryModal()}
        
        {confirmation && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 6000, padding: '20px'
          }}>
            <div className="premium-card animate-scale-in" style={{ width: '400px', textAlign: 'center' }}>
              <h3 style={{ marginTop: 0, color: 'var(--fiba-blue)' }}>CONFIRMAR ACCIÓN</h3>
              <p style={{ fontSize: '1.1rem', margin: '1.5rem 0', fontWeight: 600 }}>{confirmation.message}</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setConfirmation(null)} 
                  style={{ flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                >
                  CANCELAR
                </button>
                <button 
                  onClick={() => { confirmation.onAccept(); setConfirmation(null); }} 
                  style={{ flex: 1, padding: '12px', background: 'var(--fiba-green)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                >
                  ACEPTAR
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
