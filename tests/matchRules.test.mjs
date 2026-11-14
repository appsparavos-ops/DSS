import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const transpile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const asModule = javascript => `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`;
const rulesUrl = asModule(transpile(await readFile(new URL('../src/utils/matchRules.ts', import.meta.url), 'utf8')));
const rules = await import(rulesUrl);
const historySource = transpile(await readFile(new URL('../src/utils/gameHistory.ts', import.meta.url), 'utf8'))
  .replace("from './matchRules'", `from '${rulesUrl}'`);
const { rebuildGameFromHistory } = await import(asModule(historySource));

const player = (id = 'p') => ({ id, name: id, number: '4', points: 0, fouls: [], hasEntered: false });
const team = (id = 'p') => ({
  name: id, score: 0, foulsPerPeriod: [0, 0, 0, 0], timeouts: [],
  headCoachFouls: [], assistantCoachFouls: [], players: [player(id)],
});
const freshState = (matchFormat = '4x10') => ({
  matchFormat, period: 1, timer: matchFormat === '6x7' ? 420 : 600,
  status: 'SETUP', hasStarted: false, isRunning: false, history: [],
  teamA: team('a'), teamB: team('b'), possessionArrow: null,
});
const event = (id, period, type, teamSide = 'A', extra = {}) => ({
  id, period, type, teamSide, timeRemaining: '07:00', timestamp: '', description: '', ...extra,
});

test('el formato antiguo o desconocido se interpreta como 4 cuartos de 10 minutos', () => {
  assert.equal(rules.normalizeMatchFormat(undefined), '4x10');
  assert.equal(rules.normalizeMatchFormat('otro'), '4x10');
  assert.equal(rules.normalizeMatchFormat('6x7'), '6x7');
  assert.equal(rules.getRegulationPeriods(undefined), 4);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(p => rules.getPeriodDuration(undefined, p)), [600, 600, 600, 600, 300, 300]);
  assert.equal(rules.getPeriodLabel(undefined, 5), 'OT');
  assert.equal(rules.getPeriodLabel(undefined, 6), 'OT2');
  assert.equal(rules.allowsTimeouts(undefined), true);
  assert.equal(rules.allowsOvertime(undefined), true);
});

test('seis sextos independientes de siete minutos, sin tiempos muertos ni prórroga', () => {
  assert.equal(rules.getRegulationPeriods('6x7'), 6);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(p => rules.getPeriodDuration('6x7', p)), [420, 420, 420, 420, 420, 420]);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(p => rules.getTeamFoulIndex('6x7', p)), [0, 1, 2, 3, 4, 5]);
  assert.equal(rules.getTeamFoulIndex('4x10', 5), 3);
  assert.equal(rules.getPeriodLabel('6x7', 5), 'SEXTO 5');
  assert.equal(rules.getShortPeriodLabel('6x7', 6), 'S6');
  assert.equal(rules.allowsTimeouts('6x7'), false);
  assert.equal(rules.allowsOvertime('6x7'), false);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(p => rules.isRedPeriod('6x7', p)), [true, false, true, false, true, false]);
  assert.equal(rules.isRedPeriod('4x10', 5), false);
});

test('el empate puede cerrarse en el sexto, pero no en la modalidad de cuartos', () => {
  const six = { ...freshState('6x7'), period: 6 };
  assert.equal(rules.canFinishMatch({ ...six, period: 5 }), false);
  assert.equal(rules.canFinishMatch(six), true);
  const quarters = { ...freshState(), period: 4 };
  assert.equal(rules.canFinishMatch(quarters), false);
  assert.equal(rules.canFinishMatch({ ...quarters, teamA: { ...quarters.teamA, score: 2 } }), true);
  assert.equal(rules.canFinishMatch({ ...quarters, period: 5 }), false);
});

test('minutos transcurridos usan siete minutos o cinco de prórroga cuando corresponda', () => {
  assert.equal(rules.getElapsedMinute('6x7', 6, 420), 0);
  assert.equal(rules.getElapsedMinute('6x7', 6, 419), 1);
  assert.equal(rules.getElapsedMinuteFromClock('6x7', 5, '02:30'), 5);
  assert.equal(rules.getElapsedMinuteFromClock('4x10', 3, '02:30'), 8);
  assert.equal(rules.getElapsedMinuteFromClock('4x10', 5, '04:00'), 1);
});

test('se bloquea el formato tras comenzar y se reconocen señales de partidos antiguos', () => {
  const initial = freshState();
  assert.equal(rules.hasMatchStarted(initial), false);
  assert.equal(rules.hasMatchStarted({ ...initial, hasStarted: true }), true);
  assert.equal(rules.hasMatchStarted({ ...initial, status: 'PLAYING' }), true);
  assert.equal(rules.hasMatchStarted({ ...initial, hasStarted: undefined, period: 2 }), true);
  assert.equal(rules.hasMatchStarted({ ...initial, hasStarted: undefined, timer: 599 }), true);
  assert.equal(rules.hasMatchStarted({ ...initial, hasStarted: undefined, history: [event('x', 1, 'FOUL')] }), true);
  assert.equal(rules.hasMatchStarted({ ...initial, hasStarted: undefined, teamA: { ...initial.teamA, score: 2 } }), true);
  assert.equal(rules.hasMatchStarted({ ...initial, hasStarted: undefined, teamA: { ...initial.teamA, players: [{ ...player('a'), hasEntered: true }] } }), true);
});

test('reconstruir el historial conserva faltas separadas en los sextos 4, 5 y 6', () => {
  const state = { ...freshState('6x7'), status: 'PLAYING', period: 6 };
  const events = [
    event('f1', 1, 'FOUL', 'A', { playerId: 'a', subType: 'P' }),
    ...[1, 2, 3, 4].map(n => event(`f4-${n}`, 4, 'FOUL', 'A', { playerId: 'a', subType: 'P' })),
    ...[1, 2].map(n => event(`f5-${n}`, 5, 'FOUL', 'A', { playerId: 'a', subType: 'P' })),
    event('f6', 6, 'FOUL', 'A', { playerId: 'a', subType: 'P', foulPenalty: '2' }),
    event('f6b', 6, 'FOUL', 'B', { playerId: 'b', subType: 'P' }),
    event('hc', 6, 'FOUL', 'A', { playerId: 'HC', subType: 'C1' }),
    event('pts', 5, 'POINT3', 'A', { playerId: 'a' }),
    event('hcc', 6, 'HCC', 'A', { timeRemaining: '02:30' }),
    event('pos', 6, 'POSSESSION', 'B'),
  ].reverse();
  const result = rebuildGameFromHistory(state, events);
  assert.deepEqual(result.teamA.foulsPerPeriod, [1, 0, 0, 4, 2, 1]);
  assert.deepEqual(result.teamB.foulsPerPeriod, [0, 0, 0, 0, 0, 1]);
  assert.deepEqual(result.teamA.headCoachFouls, ['C1']);
  assert.equal(result.teamA.players[0].fouls.at(-1).penalty, '2');
  assert.equal(result.teamA.score, 3);
  assert.equal(result.teamA.players[0].points, 3);
  assert.deepEqual(result.teamA.hcc, { period: 6, minute: 5 });
  assert.equal(result.possessionArrow, 'B');
  assert.deepEqual(state.teamA.foulsPerPeriod, [0, 0, 0, 0]); // no modifica el estado anterior

  const deleted = rebuildGameFromHistory(result, events.filter(e => e.id !== 'f5-1'));
  assert.deepEqual(deleted.teamA.foulsPerPeriod, [1, 0, 0, 4, 1, 1]);
  const edited = rebuildGameFromHistory(result, events.map(e => e.id === 'f6' ? { ...e, teamSide: 'B', playerId: 'b' } : e));
  assert.deepEqual(edited.teamA.foulsPerPeriod, [1, 0, 0, 4, 2, 0]);
  assert.deepEqual(edited.teamB.foulsPerPeriod, [0, 0, 0, 0, 0, 2]);
});

test('reconstruir un partido antiguo conserva las cuatro casillas y acumula prórroga en la cuarta', () => {
  const state = { ...freshState(), matchFormat: undefined, status: 'PLAYING', period: 5 };
  const events = [
    event('to', 5, 'TIMEOUT', 'A', { timeRemaining: '04:00' }),
    event('f5', 5, 'FOUL', 'A', { playerId: 'a', subType: 'P' }),
    event('f4', 4, 'FOUL', 'A', { playerId: 'a', subType: 'P' }),
  ];
  const result = rebuildGameFromHistory(state, events);
  assert.deepEqual(result.teamA.foulsPerPeriod, [0, 0, 0, 2]);
  assert.deepEqual(result.teamA.timeouts, [{ period: 5, minute: 1 }]);
});
