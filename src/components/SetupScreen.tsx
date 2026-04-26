import React from 'react';
import type { Team, Player } from '../types';
import JerseyIcon from './JerseyIcon';

interface SetupScreenProps {
  teamA: Team;
  teamB: Team;
  onUpdateTeamName: (side: 'A' | 'B', name: string) => void;
  onUpdateTeamColor: (side: 'A' | 'B', color: string) => void;
  onUpdateTeamTextColor: (side: 'A' | 'B', color: string) => void;
  onUpdateTeamCoach: (side: 'A' | 'B', field: 'headCoach' | 'assistantCoach', value: string) => void;
  onUpdateTeamLogo: (side: 'A' | 'B', logo: string) => void;
  onUpdatePlayer: (side: 'A' | 'B', playerId: string, updates: Partial<Player>) => void;
  onSetTeamPlayers: (side: 'A' | 'B', players: Player[]) => void;
  onStartGame: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({
  teamA,
  teamB,
  onUpdateTeamName,
  onUpdateTeamColor,
  onUpdateTeamTextColor,
  onUpdateTeamCoach,
  onUpdateTeamLogo,
  onUpdatePlayer,
  onSetTeamPlayers,
  onStartGame,
}) => {
  const [showWarning, setShowWarning] = React.useState<string[] | null>(null);

  const validateAndStart = () => {
    const warnings: string[] = [];
    
    const validateTeam = (team: Team, side: string) => {
      const rosterCount = team.players.filter(p => p.isInRoster).length;
      const starterCount = team.players.filter(p => p.isStarter).length;
      const hasCaptain = team.players.some(p => p.isCaptain);
      const hasCoach = team.headCoach.trim() !== '' || team.assistantCoach.trim() !== '';
      
      const rosterPlayers = team.players.filter(p => p.isInRoster && p.name.trim() !== '');
      const rosterNumbers = rosterPlayers.map(p => p.number.trim()).filter(n => n !== '');
      const hasDuplicateNumbers = new Set(rosterNumbers).size !== rosterNumbers.length;
      const hasMissingNumbers = rosterPlayers.some(p => p.number.trim() === '');

      if (rosterCount < 5) warnings.push(`Equipo ${side}: Menos de 5 jugadores en el roster (${rosterCount}).`);
      if (starterCount !== 5) warnings.push(`Equipo ${side}: Debe haber exactamente 5 titulares (hay ${starterCount}).`);
      if (!hasCaptain) warnings.push(`Equipo ${side}: No se ha seleccionado un capitán.`);
      if (!hasCoach) warnings.push(`Equipo ${side}: No hay entrenador (HC o AC) registrado.`);
      if (hasDuplicateNumbers) warnings.push(`Equipo ${side}: Existen números de camiseta duplicados en el roster.`);
      if (hasMissingNumbers) warnings.push(`Equipo ${side}: Hay jugadores en el roster sin número asignado.`);
    };

    validateTeam(teamA, 'A');
    validateTeam(teamB, 'B');

    if (warnings.length > 0) {
      setShowWarning(warnings);
    } else {
      onStartGame();
    }
  };
  const colors = [
    '#1a237e', // FIBA Blue
    '#b71c1c', // Red
    '#ffffff', // White
    '#000000', // Black
    '#ffeb3b', // Yellow
    '#4caf50', // Green
    '#ff9800', // Orange
    '#9c27b0', // Purple
    '#00ADEF', // Celeste
    '#795548', // Marrón
  ];

  const [activeTabA, setActiveTabA] = React.useState<'JERSEY' | 'NUMBER'>('JERSEY');
  const [activeTabB, setActiveTabB] = React.useState<'JERSEY' | 'NUMBER'>('JERSEY');

  const renderTeamSetup = (side: 'A' | 'B', team: Team) => {
    const rosterNumbers = team.players.filter(p => p.isInRoster && p.name.trim() !== '' && p.number.trim() !== '').map(p => p.number.trim());
    const duplicateNumbers = new Set(rosterNumbers.filter((num, index) => rosterNumbers.indexOf(num) !== index));

    return (
    <div className="premium-card animate-fade-in" style={{ flex: 1, borderTop: `6px solid ${team.color || 'var(--fiba-blue)'}` }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            NOMBRE DEL EQUIPO {side}
          </label>
          <input 
            type="text" 
            value={team.name}
            onChange={(e) => onUpdateTeamName(side, e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              fontSize: '1.2rem', 
              fontWeight: 700,
              border: '2px solid #eee',
              borderRadius: '8px',
              outline: 'none',
              color: team.color || 'var(--fiba-blue)'
            }}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => side === 'A' ? setActiveTabA('JERSEY') : setActiveTabB('JERSEY')}
              style={{
                flex: 1, padding: '4px', fontSize: '0.7rem', fontWeight: 800,
                background: (side === 'A' ? activeTabA : activeTabB) === 'JERSEY' ? 'var(--fiba-blue)' : '#eee',
                color: (side === 'A' ? activeTabA : activeTabB) === 'JERSEY' ? 'white' : '#666',
                border: 'none', borderRadius: '4px', cursor: 'pointer'
              }}
            >CAMISETA</button>
            <button 
              onClick={() => side === 'A' ? setActiveTabA('NUMBER') : setActiveTabB('NUMBER')}
              style={{
                flex: 1, padding: '4px', fontSize: '0.7rem', fontWeight: 800,
                background: (side === 'A' ? activeTabA : activeTabB) === 'NUMBER' ? 'var(--fiba-blue)' : '#eee',
                color: (side === 'A' ? activeTabA : activeTabB) === 'NUMBER' ? 'white' : '#666',
                border: 'none', borderRadius: '4px', cursor: 'pointer'
              }}
            >NÚMEROS</button>
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {colors.map(c => {
              const isActive = (side === 'A' ? activeTabA : activeTabB) === 'JERSEY' 
                ? team.color === c 
                : team.textColor === c;
              
              return (
                <button
                  key={c}
                  onClick={() => (side === 'A' ? activeTabA : activeTabB) === 'JERSEY' ? onUpdateTeamColor(side, c) : onUpdateTeamTextColor(side, c)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    backgroundColor: c,
                    border: isActive ? '2px solid #333' : '1px solid #ddd',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 900,
                    color: (c === '#ffffff' || c === '#ffeb3b') ? '#000' : '#fff'
                  }}
                  title={c}
                >
                  {(side === 'A' ? activeTabA : activeTabB) === 'NUMBER' ? '7' : ''}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
          <JerseyIcon color={team.color} numberColor={team.textColor || '#ffffff'} number="7" size={60} />
        </div>
      </div>

      {/* Logo del equipo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.5rem', border: '1px dashed #ddd', borderRadius: '8px' }}>
        {team.logo ? (
          <img src={team.logo} alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '6px' }} />
        ) : (
          <div style={{ width: '48px', height: '48px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <JerseyIcon color={team.color || 'var(--fiba-blue)'} numberColor={team.textColor || '#ffffff'} number={team.name ? team.name[0].toUpperCase() : ''} size={48} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LOGO / ESCUDO</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => onUpdateTeamLogo(side, reader.result as string);
                reader.readAsDataURL(file);
              }
            }}
            style={{ fontSize: '0.78rem', width: '100%' }}
          />
        </div>
        {team.logo && (
          <button
            onClick={() => onUpdateTeamLogo(side, '')}
            style={{ background: 'none', color: '#ccc', fontSize: '1rem', padding: '0', border: 'none', cursor: 'pointer' }}
            title="Quitar logo"
          >✕</button>
        )}
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: '0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plantilla de Jugadores</h4>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <label className="btn-small" style={{ background: '#f0f0f0', color: '#555', cursor: 'pointer', fontSize: '0.7rem' }}>
            📥 IMPORTAR CSV
            <input 
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }} 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const text = event.target?.result as string;
                    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                    const parsedPlayers = lines.map((line) => {
                      const parts = line.split(';').map(s => s.trim());
                      let license = '', number = '', name = '';
                      if (parts.length >= 3) {
                        [license, number, name] = parts;
                      } else if (parts.length === 2) {
                        [number, name] = parts;
                      } else {
                        name = parts[0];
                      }
                      return {
                        id: Math.random().toString(36).substr(2, 9),
                        name: name ? name.toUpperCase() : '',
                        number: number || '',
                        license: license || '',
                        points: 0,
                        fouls: [],
                        isStarter: false,
                        isCaptain: false,
                        isInRoster: false,
                        hasEntered: false,
                      };
                    });

                    // Si hay menos de 12 jugadores, rellenar con espacios vacíos hasta llegar a 12
                    const newPlayers = [...parsedPlayers];
                    while (newPlayers.length < 12) {
                      newPlayers.push({
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
                      });
                    }

                    // Marcar automáticamente los primeros 12 con nombre como parte del roster
                    let selected = 0;
                    newPlayers.forEach(p => {
                      if (p.name && selected < 12) {
                        p.isInRoster = true;
                        selected++;
                      }
                    });
                    
                    onSetTeamPlayers(side, newPlayers);
                  };
                  reader.readAsText(file);
                }
              }}
            />
          </label>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            padding: '2px 8px', 
            borderRadius: '10px', 
            background: team.players.filter(p => p.isInRoster).length <= 12 ? 'var(--fiba-blue)' : '#ff4444',
            color: 'white'
          }}>
            {team.players.filter(p => p.isInRoster).length} / 12 EN ROSTER
          </span>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            padding: '2px 8px', 
            borderRadius: '10px', 
            background: team.players.filter(p => p.isStarter).length === 5 ? 'var(--fiba-green)' : '#eee',
            color: team.players.filter(p => p.isStarter).length === 5 ? 'white' : '#666'
          }}>
            {team.players.filter(p => p.isStarter).length} / 5 TITULARES
          </span>
        </div>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', marginBottom: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f9f9f9', zIndex: 10 }}>
            <tr style={{ textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.5rem', width: '50px' }}>LIC</th>
              <th style={{ padding: '0.5rem', width: '40px' }}>#</th>
              <th style={{ padding: '0.5rem' }}>Nombre del Jugador</th>
              <th style={{ padding: '0.5rem', width: '50px', textAlign: 'center' }}>ROSTER</th>
              <th style={{ padding: '0.5rem', width: '40px', textAlign: 'center' }}>TIT</th>
              <th style={{ padding: '0.5rem', width: '40px', textAlign: 'center' }}>CAP</th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((player) => {
              const starterCount = team.players.filter(p => p.isStarter).length;
              const isMissingData = !player.name.trim() || !player.number.trim();
              const atRosterLimit = team.players.filter(p => p.isInRoster).length >= 12;
              
              return (
                <tr key={player.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ width: '50px', padding: '0.25rem' }}>
                    <input 
                      type="text" 
                      value={player.license || ''}
                      onChange={(e) => onUpdatePlayer(side, player.id, { license: e.target.value })}
                      style={{ width: '100%', padding: '0.4rem', textAlign: 'center', border: '1px solid #eee', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ width: '60px', padding: '0.25rem' }}>
                    <input 
                      type="text" 
                      value={player.number}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates: Partial<Player> = { number: val };
                        if (!val.trim() || !player.name.trim()) {
                          updates.isInRoster = false;
                          updates.isStarter = false;
                          updates.isCaptain = false;
                        }
                        onUpdatePlayer(side, player.id, updates);
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '0.4rem', 
                        textAlign: 'center', 
                        border: player.isInRoster && player.name.trim() !== '' && player.number.trim() && duplicateNumbers.has(player.number.trim()) ? '2px solid #f44336' : '1px solid #eee', 
                        backgroundColor: player.isInRoster && player.name.trim() !== '' && player.number.trim() && duplicateNumbers.has(player.number.trim()) ? '#ffebee' : '#fff',
                        borderRadius: '4px' 
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.25rem' }}>
                    <input 
                      type="text" 
                      value={player.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates: Partial<Player> = { name: val };
                        if (!val.trim() || !player.number.trim()) {
                          updates.isInRoster = false;
                          updates.isStarter = false;
                          updates.isCaptain = false;
                        }
                        onUpdatePlayer(side, player.id, updates);
                      }}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid #eee', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ width: '50px', padding: '0.25rem', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={player.isInRoster}
                      disabled={isMissingData || (!player.isInRoster && atRosterLimit)}
                      onChange={(e) => {
                        onUpdatePlayer(side, player.id, { isInRoster: e.target.checked });
                        if (!e.target.checked) {
                          onUpdatePlayer(side, player.id, { isStarter: false, isCaptain: false });
                        }
                      }}
                      style={{ width: '18px', height: '18px', cursor: (isMissingData || (!player.isInRoster && atRosterLimit)) ? 'not-allowed' : 'pointer' }}
                    />
                  </td>
                  <td style={{ width: '50px', padding: '0.25rem', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={player.isStarter}
                      disabled={!player.isInRoster || (!player.isStarter && starterCount >= 5)}
                      onChange={(e) => onUpdatePlayer(side, player.id, { isStarter: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: (!player.isInRoster || (starterCount >= 5 && !player.isStarter)) ? 'not-allowed' : 'pointer' }}
                    />
                  </td>
                  <td style={{ width: '50px', padding: '0.25rem', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={player.isCaptain}
                      disabled={!player.isInRoster}
                      onChange={(e) => {
                        // Desmarcar a cualquier otro capitán antes de marcar al nuevo
                        if (e.target.checked) {
                          team.players.forEach(p => {
                            if (p.isCaptain && p.id !== player.id) {
                              onUpdatePlayer(side, p.id, { isCaptain: false });
                            }
                          });
                        }
                        onUpdatePlayer(side, player.id, { isCaptain: e.target.checked });
                      }}
                      style={{ width: '18px', height: '18px', cursor: !player.isInRoster ? 'not-allowed' : 'pointer' }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cuerpo Técnico</h4>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>HC – ENTRENADOR PRINCIPAL</label>
            <input
              type="text"
              value={team.headCoach || ''}
              onChange={(e) => onUpdateTeamCoach(side, 'headCoach', e.target.value)}
              placeholder="Nombre del HC"
              style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #eee', borderRadius: '6px', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>AC – ASISTENTE</label>
            <input
              type="text"
              value={team.assistantCoach || ''}
              onChange={(e) => onUpdateTeamCoach(side, 'assistantCoach', e.target.value)}
              placeholder="Nombre del AC"
              style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #eee', borderRadius: '6px', fontSize: '0.9rem' }}
            />
          </div>
        </div>
        </div>
      </div>
    );
  };
  const [activeTeamTablet, setActiveTeamTablet] = React.useState<'A' | 'B'>('A');

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--fiba-blue)' }}>PREPARACIÓN DEL PARTIDO</h2>
        <p style={{ color: 'var(--text-muted)' }}>Configura los equipos antes de comenzar el acta oficial</p>
      </div>

      <div className="setup-team-tabs">
        <button 
          className={`setup-team-tab ${activeTeamTablet === 'A' ? 'active' : ''}`}
          onClick={() => setActiveTeamTablet('A')}
          style={{ background: activeTeamTablet === 'A' ? (teamA.color || 'var(--fiba-blue)') : '#eee', color: activeTeamTablet === 'A' ? (teamA.textColor || '#fff') : '#666' }}
        >
          {teamA.name || 'EQUIPO A'}
        </button>
        <button 
          className={`setup-team-tab ${activeTeamTablet === 'B' ? 'active' : ''}`}
          onClick={() => setActiveTeamTablet('B')}
          style={{ background: activeTeamTablet === 'B' ? (teamB.color || 'var(--fiba-blue)') : '#eee', color: activeTeamTablet === 'B' ? (teamB.textColor || '#fff') : '#666' }}
        >
          {teamB.name || 'EQUIPO B'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }} className="setup-teams-container">
        <div className={`setup-team-wrapper ${activeTeamTablet === 'A' ? 'active-tablet' : 'inactive-tablet'}`} style={{ flex: 1 }}>
          {renderTeamSetup('A', teamA)}
        </div>
        <div className={`setup-team-wrapper ${activeTeamTablet === 'B' ? 'active-tablet' : 'inactive-tablet'}`} style={{ flex: 1 }}>
          {renderTeamSetup('B', teamB)}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={validateAndStart}
          className="btn-primary"
          style={{ 
            fontSize: '1.2rem', 
            padding: '1rem 3rem', 
            background: 'var(--fiba-green)',
            boxShadow: '0 4px 15px rgba(0, 132, 61, 0.3)'
          }}
        >
          COMENZAR PARTIDO OFICIAL
        </button>
      </div>

      {showWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 5000, padding: '20px'
        }}>
          <div className="premium-card animate-scale-in" style={{ width: '500px', maxWidth: '100%' }}>
            <h3 style={{ color: '#d32f2f', marginTop: 0 }}>⚠️ ADVERTENCIAS DE REQUISITOS</h3>
            <div style={{ background: '#fff8f8', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #d32f2f', marginBottom: '1.5rem' }}>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#333', fontSize: '0.9rem', lineHeight: '1.6' }}>
                {showWarning.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem' }}>¿Deseas continuar hacia el juego a pesar de estas advertencias?</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowWarning(null)} 
                style={{ flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
              >
                VOLVER
              </button>
              <button 
                onClick={() => { setShowWarning(null); onStartGame(); }} 
                style={{ flex: 1, padding: '12px', background: 'var(--fiba-green)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
              >
                ACEPTAR Y COMENZAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupScreen;
