import { jsPDF } from 'jspdf';
import type { GameState, Team } from '../types';

export const generatePDF = (state: GameState) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const { teamA, teamB, history } = state;
  const pageWidth = doc.internal.pageSize.getWidth();

  const getSortedPlayers = (players: any[]) => {
    return [...players].sort((a, b) => {
      const hasA = a.name.trim() || a.number.trim();
      const hasB = b.name.trim() || b.number.trim();
      if (!hasA && hasB) return 1;
      if (hasA && !hasB) return -1;
      if (!hasA && !hasB) return 0;
      return (parseInt(a.number) || 0) - (parseInt(b.number) || 0);
    });
  };

  const drawGrid = (x: number, y: number, rows: number, cols: number, rowH: number, colW: number[]) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.12);
    const totalW = colW.reduce((a, b) => a + b, 0);
    for (let i = 0; i <= rows; i++) doc.line(x, y + i * rowH, x + totalW, y + i * rowH);
    let curX = x;
    for (let i = 0; i <= cols; i++) {
      doc.line(curX, y, curX, y + rows * rowH);
      if (i < cols) curX += colW[i];
    }
  };

  const getTeamFoulsInPeriod = (side: 'A' | 'B', period: number) => {
    return history.filter(ev => ev.teamSide === side && ev.period === period && ev.type === 'FOUL').length;
  };

  const getPeriodColor = (p: number): [number, number, number] => {
    if (p === 1 || p === 3) return [200, 0, 0];
    return [0, 0, 180];
  };

  // ─── HEADER ───
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('FIBA SCORE SHEET', pageWidth / 2, 10, { align: 'center' });
  
  doc.setFontSize(8.5);
  // Fila 1: Equipos
  doc.setFont('helvetica', 'bold'); doc.text('EQUIPO A:', 10, 15); doc.setFont('helvetica', 'normal'); doc.text(teamA.name, 28, 15);
  doc.setFont('helvetica', 'bold'); doc.text('EQUIPO B:', 110, 15); doc.setFont('helvetica', 'normal'); doc.text(teamB.name, 128, 15);
  
  // Fila 2: Competición, Fecha, Hora, Lugar
  doc.setFont('helvetica', 'bold'); doc.text('COMPETICIÓN:', 10, 19.5); doc.setFont('helvetica', 'normal'); doc.text(state.competition || 'OFICIAL', 34, 19.5);
  doc.setFont('helvetica', 'bold'); doc.text('FECHA:', 80, 19.5); doc.setFont('helvetica', 'normal'); doc.text(state.date || new Date().toLocaleDateString(), 93, 19.5);
  doc.setFont('helvetica', 'bold'); doc.text('HORA:', 125, 19.5); doc.setFont('helvetica', 'normal'); doc.text(state.timeStart || '12:00', 137, 19.5);
  doc.setFont('helvetica', 'bold'); doc.text('LUGAR:', 160, 19.5); doc.setFont('helvetica', 'normal'); doc.text(state.venue || 'SEDE CENTRAL', 173, 19.5);

  // Fila 3: Jueces
  doc.setFont('helvetica', 'bold'); doc.text('CREW CHIEF:', 10, 24); doc.setFont('helvetica', 'normal'); doc.text(state.crewChief || '', 32, 24);
  doc.setFont('helvetica', 'bold'); doc.text('UMPIRE 1:', 80, 24); doc.setFont('helvetica', 'normal'); doc.text(state.umpire1 || '', 98, 24);
  doc.setFont('helvetica', 'bold'); doc.text('UMPIRE 2:', 145, 24); doc.setFont('helvetica', 'normal'); doc.text(state.umpire2 || '', 163, 24);

  doc.setLineWidth(0.2); doc.line(10, 25, pageWidth - 10, 25);

  // ─── TEAM SECTION ───
  const drawTeam = (team: Team, startY: number, label: 'A' | 'B') => {
    let curY = startY;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(`EQUIPO ${label}: ${team.name}`, 10, curY);
    
    curY += 4;
    doc.setFontSize(7);
    doc.text('TIME OUTS', 10, curY);
    doc.text('TEAM FOULS', 40, curY);

    const drawFoulBoxes = (qx: number, qy: number, qNum: number) => {
      doc.text(`Q${qNum}`, qx, qy);
      const qf = getTeamFoulsInPeriod(label, qNum);
      const isFinished = qNum < state.period || (qNum === state.period && state.status === 'FINISHED');
      const c = getPeriodColor(qNum);
      for(let f=1; f<=4; f++) {
        const bx = qx + 5 + (f * 3.5);
        doc.setDrawColor(0); doc.setLineWidth(0.12);
        doc.rect(bx, qy - 2.2, 2.8, 2.8);
        if (f <= qf) {
          doc.setTextColor(c[0], c[1], c[2]);
          doc.text('X', bx + 0.5, qy - 0.3);
        } else if (isFinished) {
          doc.setDrawColor(c[0], c[1], c[2]); doc.setLineWidth(0.25);
          doc.line(bx + 0.5, qy - 0.8, bx + 2.3, qy - 0.8);
        }
      }
      doc.setTextColor(0); doc.setDrawColor(0);
    };

    // Fila 3: H1 (2 TO) + Q1 + Q2
    curY += 3.5;
    doc.text('H1', 10, curY);
    const isH1Finished = state.period >= 3;
    [0, 1].forEach((idx) => {
      const tx = 14 + (idx * 4.5);
      doc.setDrawColor(0); doc.setLineWidth(0.12); doc.rect(tx, curY - 2.2, 3.5, 3);
      const to = team.timeouts.filter(t => t.period <= 2)[idx];
      if (to) {
        const tc = getPeriodColor(to.period);
        doc.setTextColor(tc[0], tc[1], tc[2]);
        doc.text(String(to.minute), tx + 0.8, curY - 0.2);
        doc.setTextColor(0);
      } else if (isH1Finished) {
        doc.setDrawColor(0, 0, 180); doc.setLineWidth(0.3);
        doc.line(tx + 0.5, curY - 0.7, tx + 3, curY - 0.7);
      }
    });
    drawFoulBoxes(40, curY, 1);
    drawFoulBoxes(65, curY, 2);

    // Fila 4: H2 (3 TO) + Q3 + Q4
    curY += 4;
    doc.text('H2', 10, curY);
    const isH2Finished = state.period >= 5 || state.status === 'FINISHED';
    [0, 1, 2].forEach((idx) => {
      const tx = 14 + (idx * 4.5);
      doc.setDrawColor(0); doc.setLineWidth(0.12); doc.rect(tx, curY - 2.2, 3.5, 3);
      const to = team.timeouts.filter(t => t.period >= 3 && t.period <= 4)[idx];
      if (to) {
        const tc = getPeriodColor(to.period);
        doc.setTextColor(tc[0], tc[1], tc[2]);
        doc.text(String(to.minute), tx + 0.8, curY - 0.2);
        doc.setTextColor(0);
      } else if (isH2Finished) {
        doc.setDrawColor(0, 0, 180); doc.setLineWidth(0.3);
        doc.line(tx + 0.5, curY - 0.7, tx + 3, curY - 0.7);
      }
    });
    drawFoulBoxes(40, curY, 3);
    drawFoulBoxes(65, curY, 4);

    // Fila 5: OT (3 TO) + HCC
    curY += 4;
    doc.text('OT', 10, curY);
    [0, 1, 2].forEach((idx) => {
      const tx = 14 + (idx * 4.5);
      doc.rect(tx, curY - 2.2, 3.5, 3);
      const to = team.timeouts.filter(t => t.period >= 5)[idx];
      if (to) {
        const tc = getPeriodColor(to.period);
        doc.setTextColor(tc[0], tc[1], tc[2]);
        doc.text(String(to.minute), tx + 0.8, curY - 0.2);
        doc.setTextColor(0);
      } else if (state.status === 'FINISHED') {
        doc.setDrawColor(0, 0, 180); doc.setLineWidth(0.3);
        doc.line(tx + 0.5, curY - 0.7, tx + 3, curY - 0.7);
      }
    });
    doc.text('HCC', 40, curY);
    doc.rect(48, curY - 2.2, 3.5, 3); doc.rect(53, curY - 2.2, 3.5, 3);
    if (team.hcc) {
      const hccColor = getPeriodColor(team.hcc.period);
      doc.setTextColor(hccColor[0], hccColor[1], hccColor[2]);
      doc.text(String(team.hcc.period), 48 + 1.75, curY - 0.2, { align: 'center' });
      doc.text(String(team.hcc.minute), 53 + 1.75, curY - 0.2, { align: 'center' });
      doc.setTextColor(0);
    }

    const tableY = curY + 4;
    const colW = [12, 31, 8, 6, 6, 6, 6, 6, 6]; 
    const rowH = 5.0;
    drawGrid(10, tableY, 13, 9, rowH, colW);
    doc.setFontSize(7);
    const headers = ['LIC', 'NOMBRE DEL JUGADOR', 'Nº', 'I', '1', '2', '3', '4', '5'];
    let curX = 10;
    headers.forEach((h, i) => {
      doc.text(h, curX + colW[i]/2, tableY + 3.2, { align: 'center' });
      curX += colW[i];
    });

    const sortedPlayers = getSortedPlayers(team.players);
    sortedPlayers.forEach((p, idx) => {
      const py = tableY + (idx + 1) * rowH;
      let cx = 10;
      if (p.name.trim() || p.number.trim()) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        doc.text(p.license || '', cx + colW[0]/2, py + 3.5, { align: 'center' }); cx += colW[0];
        const displayName = (p.name || '') + (p.isCaptain ? ' (CAP)' : '');
        doc.text(displayName, cx + 2, py + 3.5); cx += colW[1];
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text(p.number || '', cx + colW[2]/2, py + 3.5, { align: 'center' }); cx += colW[2];
        if (p.isStarter) { 
          doc.setDrawColor(0, 0, 180); doc.setTextColor(0, 0, 180);
          doc.circle(cx + colW[3]/2, py + 2.5, 1.5); 
          doc.text('X', cx + colW[3]/2, py + 3.3, { align: 'center' }); 
        }
        else if (p.hasEntered) { 
          const ec = getPeriodColor(p.entryPeriod || 1);
          doc.setTextColor(ec[0], ec[1], ec[2]);
          doc.text('X', cx + colW[3]/2, py + 3.3, { align: 'center' }); 
        }
        doc.setTextColor(0); doc.setDrawColor(0); // Reset color
        cx += colW[3];
        p.fouls.forEach((f: any, fi: number) => { 
          if (fi < 5) {
            const fc = getPeriodColor(f.period);
            doc.setTextColor(fc[0], fc[1], fc[2]);
            doc.text(f.type, cx + fi * 6 + 3, py + 3.5, { align: 'center' }); 
          }
        });

        // ─── LÓGICA DE GD (DESCALIFICACIÓN) ───
        const uCount = p.fouls.filter((f: any) => f.type === 'U2').length;
        const tCount = p.fouls.filter((f: any) => f.type === 'T1').length;
        const isDoubleTU = uCount >= 2 || tCount >= 2 || (uCount >= 1 && tCount >= 1);
        const hasD = p.fouls.some((f: any) => f.type === 'D');
        const has5Fouls = p.fouls.length >= 5;

        if (state.status === 'FINISHED' && p.fouls.length < 5 && !has5Fouls && !isDoubleTU && !hasD) {
          doc.setDrawColor(0, 0, 180); doc.setLineWidth(0.3);
          for (let i = p.fouls.length; i < 5; i++) {
            doc.line(cx + i * 6 + 1.5, py + 2.5, cx + i * 6 + 4.5, py + 2.5);
          }
        }

        if (has5Fouls || isDoubleTU || hasD) {
          const lastFoul = p.fouls[p.fouls.length - 1];
          const c = lastFoul ? getPeriodColor(lastFoul.period) : [0, 0, 0];
          doc.setTextColor(c[0], c[1], c[2]);

          if (has5Fouls) {
            doc.setFontSize(5);
            doc.text('GD', cx + 4 * 6 + 5.2, py + 3.5);
          } else {
            doc.setFontSize(7);
            for (let i = p.fouls.length; i < 5; i++) {
              doc.text('GD', cx + i * 6 + 3, py + 3.5, { align: 'center' });
            }
          }
          doc.setFontSize(8);
        }

        doc.setTextColor(0); // Reset
      } else {
        // Espacio en blanco: inutilizar con línea azul
        doc.setDrawColor(0, 0, 180); 
        doc.setLineWidth(0.3);
        const totalW = colW.reduce((a, b) => a + b, 0);
        doc.line(10, py + rowH / 2, 10 + totalW, py + rowH / 2);
        doc.setDrawColor(0); // Reset
      }
    });

    const coachY = tableY + 13 * rowH + 4.5;
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text(`ENTRENADOR: ${team.headCoach || '—'}`, 10, coachY);
    doc.text(`FALTAS: ${team.headCoachFouls.join(' ')}`, 65, coachY);
    


    doc.setFont('helvetica', 'normal');
    doc.text(`AYUDANTE: ${team.assistantCoach || '—'}`, 10, coachY + 5.5);
    doc.text(`FALTAS: ${team.assistantCoachFouls.join(' ')}`, 65, coachY + 5.5);
  };

  drawTeam(teamA, 30, 'A');
  drawTeam(teamB, 145, 'B');

  // ─── RUNNING SCORE (COLUMNAS ENSANCHADAS) ───
  const rsX = 105; 
  const rsY = 30;
  const rsColW = [5.2, 5.2, 5.2, 5.2]; // Ensanchado de 4.5 a 5.2mm por columna
  const rsRowH = 5.5;
  const blockW = rsColW.reduce((a, b) => a + b, 0);

  for (let c = 0; c < 4; c++) {
    const x = rsX + (c * (blockW + 4)); // 4mm de separación entre bloques
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('A', x + rsColW[0], rsY - 2, { align: 'center' });
    doc.text('B', x + blockW - rsColW[3], rsY - 2, { align: 'center' });
    drawGrid(x, rsY, 40, 4, rsRowH, rsColW);
    
    for (let p = 1; p <= 40; p++) {
      const score = p + c * 40;
      doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
      doc.text(String(score), x + rsColW[0] + rsColW[1]/2, rsY + (p - 1) * rsRowH + 3.8, { align: 'center' });
      doc.text(String(score), x + rsColW[0] + rsColW[1] + rsColW[2]/2, rsY + (p - 1) * rsRowH + 3.8, { align: 'center' });
    }

    let sA = 0; let sB = 0;
    [...history].reverse().forEach(ev => {
      const isA = ev.teamSide === 'A';
      const pts = ev.type === 'POINT1' ? 1 : ev.type === 'POINT2' ? 2 : ev.type === 'POINT3' ? 3 : 0;
      if (pts > 0) {
        if (isA) sA += pts; else sB += pts;
        const score = isA ? sA : sB;
        if (score > c * 40 && score <= (c + 1) * 40) {
          const row = (score - 1) % 40;
          const py = rsY + row * rsRowH;
          const pNum = (isA ? teamA : teamB).players.find(p => p.id === ev.playerId)?.number || '';
          const pColor = getPeriodColor(ev.period);
          doc.setTextColor(pColor[0], pColor[1], pColor[2]);
          doc.setDrawColor(pColor[0], pColor[1], pColor[2]);
          doc.setLineWidth(0.2);

          const nx = x + (isA ? rsColW[0] : rsColW[0] + rsColW[1]); 
          if (ev.type === 'POINT1') {
            doc.text('•', nx + rsColW[1]/2, py + 3.8, { align: 'center' });
          } else {
            doc.line(nx + 0.5, py + 1.5, nx + rsColW[1] - 0.5, py + 4.8);
            if (ev.type === 'POINT3') {
              doc.circle(x + (isA ? rsColW[0]/2 : blockW - rsColW[3]/2), py + 2.8, 1.8);
            }
          }
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
          doc.text(pNum, x + (isA ? rsColW[0]/2 : blockW - rsColW[3]/2), py + 4.0, { align: 'center' });
        }
      }
    });

    for (let p = 1; p < state.period; p++) {
      const pColor = getPeriodColor(p);
      doc.setDrawColor(pColor[0], pColor[1], pColor[2]);
      doc.setLineWidth(0.4);
      ['A', 'B'].forEach(side => {
        const isA = side === 'A';
        const scoreAtEnd = history
          .filter(ev => ev.teamSide === side && ev.period <= p && ev.type.startsWith('POINT'))
          .reduce((sum, ev) => sum + (ev.type === 'POINT1' ? 1 : ev.type === 'POINT2' ? 2 : ev.type === 'POINT3' ? 3 : 0), 0);
        if (scoreAtEnd > 0 && scoreAtEnd > c * 40 && scoreAtEnd <= (c + 1) * 40) {
          const row = (scoreAtEnd - 1) % 40;
          const lx = x + (isA ? 0 : rsColW[0] + rsColW[1]);
          const ly = rsY + row * rsRowH + rsRowH;
          doc.line(lx, ly, lx + rsColW[0] + rsColW[1], ly);
        }
      });
    }
  } // Fin loop columnas

  if (state.status === 'FINISHED') {
    const drawEndLines = (score: number, isA: boolean) => {
      const colIdx = Math.floor(score / 40);
      if (colIdx >= 4) return; // Fuera de rango
      const row = score % 40;
      const x = rsX + (colIdx * (blockW + 4));
      const cx = x + (isA ? 0 : rsColW[0] + rsColW[1]);
      const cw = isA ? rsColW[0] + rsColW[1] : rsColW[2] + rsColW[3];
      const py = rsY + row * rsRowH;
      
      doc.setDrawColor(0, 0, 180);
      doc.setLineWidth(0.6);
      // Línea gruesa horizontal debajo del último puntaje
      doc.line(cx, py, cx + cw, py);
      
      // Línea gruesa diagonal hasta el final de la columna
      if (row < 40) {
        doc.line(cx, py, cx + cw, rsY + 40 * rsRowH);
      }
    };

    drawEndLines(state.teamA.score, true);
    drawEndLines(state.teamB.score, false);
  }

  // ─── SCORES BY PERIOD ───
  const scoreY = 252;
  const getScoreInPeriod = (side: 'A' | 'B', period: number) => {
    return history.filter(ev => ev.teamSide === side && ev.period === period && ev.type.startsWith('POINT'))
      .reduce((sum, ev) => sum + (ev.type === 'POINT1' ? 1 : ev.type === 'POINT2' ? 2 : ev.type === 'POINT3' ? 3 : 0), 0);
  };
  doc.setTextColor(0); doc.setDrawColor(0); doc.setLineWidth(0.12);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('RESULTADOS PARCIALES:', 10, scoreY);
  drawGrid(10, scoreY + 2, 3, 7, 4.5, [20, 10, 10, 10, 10, 10, 12]);
  const sHeaders = ['EQUIPO', '1ST', '2ND', '3RD', '4TH', 'OT', 'TOTAL'];
  let curSX = 10;
  sHeaders.forEach((h, i) => {
    const w = i === 0 ? 20 : (i === 6 ? 12 : 10);
    doc.text(h, curSX + w/2, scoreY + 5.2, { align: 'center' });
    curSX += w;
  });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.setTextColor(0); doc.text('EQUIPO A', 12, scoreY + 9.5); 
  for (let p = 1; p <= 5; p++) {
    const pts = getScoreInPeriod('A', p);
    if (pts > 0 || p <= state.period) {
      const c = getPeriodColor(p); doc.setTextColor(c[0], c[1], c[2]);
      doc.text(String(pts), 20 + 10 * p + 5, scoreY + 9.5, { align: 'center' });
    } else if (state.status === 'FINISHED') {
      doc.setDrawColor(0, 0, 180); doc.setLineWidth(0.3);
      doc.line(20 + 10 * p + 1.5, scoreY + 8.5, 20 + 10 * p + 8.5, scoreY + 8.5);
    }
  }
  doc.setTextColor(0); doc.text(String(teamA.score), 88, scoreY + 9.5, { align: 'center' }); 
  doc.text('EQUIPO B', 12, scoreY + 14); 
  for (let p = 1; p <= 5; p++) {
    const pts = getScoreInPeriod('B', p);
    if (pts > 0 || p <= state.period) {
      const c = getPeriodColor(p); doc.setTextColor(c[0], c[1], c[2]);
      doc.text(String(pts), 20 + 10 * p + 5, scoreY + 14, { align: 'center' });
    } else if (state.status === 'FINISHED') {
      doc.setDrawColor(0, 0, 180); doc.setLineWidth(0.3);
      doc.line(20 + 10 * p + 1.5, scoreY + 13, 20 + 10 * p + 8.5, scoreY + 13);
    }
  }
  doc.setTextColor(0); doc.text(String(teamB.score), 88, scoreY + 14, { align: 'center' });

  // ─── FOOTER ───
  doc.setTextColor(0); doc.setDrawColor(0);
  const footY = 278;
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text(`ANOTADOR: ${state.scorer || ''}`, 10, footY); doc.line(28, footY + 1, 60, footY + 1);
  doc.text(`CRONOMETRISTA: ${state.timerOfficial || ''}`, 70, footY); doc.line(98, footY + 1, 130, footY + 1);
  doc.text(`CREW CHIEF: ${state.crewChief || ''}`, 140, footY); doc.line(160, footY + 1, 195, footY + 1);
  doc.text(`OPERADOR 24": ${state.shotClockOperator || ''}`, 10, footY + 6); doc.line(34, footY + 7, 65, footY + 7);
  doc.text('FIRMA CAPITÁN A:', 70, footY + 6); doc.line(98, footY + 7, 130, footY + 7);
  doc.text('FIRMA CAPITÁN B:', 140, footY + 8); doc.line(165, footY + 9, 195, footY + 9);

  const safeStr = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${safeStr(state.competition)}_${safeStr(teamA.name)}_${safeStr(teamB.name)}_${safeStr(state.date)}_${safeStr(state.timeStart)}_${safeStr(state.venue)}.pdf`;
  doc.save(filename);
};
