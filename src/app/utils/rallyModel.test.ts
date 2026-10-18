import { describe, it, expect } from 'vitest';
import {
  normalizeQuality,
  rallyOutcomeFromAction,
  computeRotation,
  computeActionPhase,
  computeRotationStats,
  computeReceptionStats,
  computeAttackStats,
  computePointsByOrigin,
  computeServeStats,
  computeSetterDistribution,
  Rally,
  LineupMap
} from './rallyModel';

describe('rallyModel unit tests', () => {
  describe('normalizeQuality', () => {
    it('normalizes legacy and new qualities correctly', () => {
      expect(normalizeQuality('#')).toBe('#');
      expect(normalizeQuality('+')).toBe('+');
      expect(normalizeQuality('!')).toBe('!');
      expect(normalizeQuality('-')).toBe('-');
      expect(normalizeQuality('=')).toBe('=');

      expect(normalizeQuality('pos')).toBe('#');
      expect(normalizeQuality('neu')).toBe('!');
      expect(normalizeQuality('neg')).toBe('=');
      expect(normalizeQuality(null)).toBe('!');
      expect(normalizeQuality(undefined)).toBe('!');
    });
  });

  describe('rallyOutcomeFromAction', () => {
    it('cierra punto con # en saque, ataque, dejada y bloqueo nuestro', () => {
      expect(rallyOutcomeFromAction({ team: 'our', gesture: 'saque', quality: '#' })).toEqual({
        isClosed: true, winner: 'our', pointType: 'ganado'
      });
      expect(rallyOutcomeFromAction({ team: 'our', gesture: 'ataque', quality: '#' })).toEqual({
        isClosed: true, winner: 'our', pointType: 'ganado'
      });
      expect(rallyOutcomeFromAction({ team: 'our', gesture: 'dejada', quality: '#' })).toEqual({
        isClosed: true, winner: 'our', pointType: 'ganado'
      });
      expect(rallyOutcomeFromAction({ team: 'our', gesture: 'bloqueo', quality: '#' })).toEqual({
        isClosed: true, winner: 'our', pointType: 'ganado'
      });
    });

    it('continúa el punto en # de recepción, armado o defensa nuestra', () => {
      expect(rallyOutcomeFromAction({ team: 'our', gesture: 'recepcion', quality: '#' }).isClosed).toBe(false);
      expect(rallyOutcomeFromAction({ team: 'our', gesture: 'armado', quality: '#' }).isClosed).toBe(false);
      expect(rallyOutcomeFromAction({ team: 'our', gesture: 'defensa', quality: '#' }).isClosed).toBe(false);
    });

    it('cierra punto para rival con pointType perdido en = de recepción nuestra (ace recibido)', () => {
      expect(rallyOutcomeFromAction({ team: 'our', gesture: 'recepcion', quality: '=' })).toEqual({
        isClosed: true, winner: 'rival', pointType: 'perdido'
      });
    });

    it('cierra punto para rival con pointType regalado_nuestro en = de otros gestos nuestros', () => {
      const gestures = ['saque', 'armado', 'ataque', 'dejada', 'bloqueo', 'defensa'] as const;
      gestures.forEach(g => {
        expect(rallyOutcomeFromAction({ team: 'our', gesture: g, quality: '=' })).toEqual({
          isClosed: true, winner: 'rival', pointType: 'regalado_nuestro'
        });
      });
    });

    it('cierra punto para nosotros en error_rival o = rival', () => {
      expect(rallyOutcomeFromAction({ team: 'rival', gesture: 'error_rival', quality: '=' })).toEqual({
        isClosed: true, winner: 'our', pointType: 'regalado_rival'
      });
    });

    it('cierra punto para rival en punto_rival o # rival', () => {
      expect(rallyOutcomeFromAction({ team: 'rival', gesture: 'punto_rival', quality: '#' })).toEqual({
        isClosed: true, winner: 'rival', pointType: 'perdido'
      });
    });
  });

  describe('computeRotation', () => {
    const players = [
      { id: 'p-setter', name: 'Valeria', position: 'Colocador' },
      { id: 'p-oh1', name: 'Sofia', position: 'Punta' },
      { id: 'p-mb1', name: 'Camila', position: 'Central' },
      { id: 'p-opp', name: 'Lucia', position: 'Opuesto' },
      { id: 'p-oh2', name: 'Elena', position: 'Punta' },
      { id: 'p-mb2', name: 'Ana', position: 'Central' },
    ];

    it('detects rotation based on setter position in lineup', () => {
      const lineupP1: LineupMap = { p1: 'p-setter', p2: 'p-oh1', p3: 'p-mb1', p4: 'p-opp', p5: 'p-oh2', p6: 'p-mb2' };
      expect(computeRotation(lineupP1, players)).toBe(1);

      const lineupP4: LineupMap = { p1: 'p-opp', p2: 'p-oh2', p3: 'p-mb2', p4: 'p-setter', p5: 'p-oh1', p6: 'p-mb1' };
      expect(computeRotation(lineupP4, players)).toBe(4);
    });

    it('falls back to rotation count if no setter in court', () => {
      const emptyLineup: LineupMap = { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null };
      expect(computeRotation(emptyLineup, players, 0)).toBe(6);
      expect(computeRotation(emptyLineup, players, 1)).toBe(1);
      expect(computeRotation(emptyLineup, players, 3)).toBe(3);
    });

    it('uses setter position primarily even when rotationCount is provided', () => {
      const lineupP3: LineupMap = { p1: 'p-oh1', p2: 'p-mb1', p3: 'p-setter', p4: 'p-opp', p5: 'p-oh2', p6: 'p-mb2' };
      expect(computeRotation(lineupP3, players, 5)).toBe(3);
    });
  });

  describe('computeActionPhase', () => {
    it('sets all actions to K2 in K2 rally (we served)', () => {
      expect(computeActionPhase('K2', [])).toBe('K2');
      expect(computeActionPhase('K2', [{ team: 'our', gesture: 'saque' }])).toBe('K2');
    });

    it('sets actions before our attack to K1 and subsequent to K2 in K1 rally', () => {
      expect(computeActionPhase('K1', [])).toBe('K1');
      expect(computeActionPhase('K1', [{ team: 'our', gesture: 'recepcion' }])).toBe('K1');
      expect(computeActionPhase('K1', [{ team: 'our', gesture: 'recepcion' }, { team: 'our', gesture: 'armado' }])).toBe('K1');
      // After attack occurred:
      expect(computeActionPhase('K1', [
        { team: 'our', gesture: 'recepcion' },
        { team: 'our', gesture: 'armado' },
        { team: 'our', gesture: 'ataque' }
      ])).toBe('K2');
    });
  });

  describe('computeRotationStats with fixture', () => {
    it('calculates side-out % and break point % accurately across ~20 rallies', () => {
      const blankLineup: LineupMap = { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null };
      const fixtureRallies: Rally[] = [
        // Rot 1: 2 K1 (1 win, 1 loss) -> 50% SO; 1 K2 (1 win) -> 100% BP
        { id: '1', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'our', pointType: 'ganado', ourScore: 1, rivalScore: 0, actions: [], lineup: blankLineup },
        { id: '2', setNum: 1, servingTeam: 'our', rotation: 1, phase: 'K2', winner: 'our', pointType: 'ganado', ourScore: 2, rivalScore: 0, actions: [], lineup: blankLineup },
        { id: '3', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'rival', pointType: 'perdido', ourScore: 2, rivalScore: 1, actions: [], lineup: blankLineup },

        // Rot 2: 3 K1 (2 wins) -> 67% SO; 2 K2 (0 wins) -> 0% BP
        { id: '4', setNum: 1, servingTeam: 'rival', rotation: 2, phase: 'K1', winner: 'our', pointType: 'ganado', ourScore: 3, rivalScore: 1, actions: [], lineup: blankLineup },
        { id: '5', setNum: 1, servingTeam: 'rival', rotation: 2, phase: 'K1', winner: 'our', pointType: 'ganado', ourScore: 4, rivalScore: 1, actions: [], lineup: blankLineup },
        { id: '6', setNum: 1, servingTeam: 'rival', rotation: 2, phase: 'K1', winner: 'rival', pointType: 'perdido', ourScore: 4, rivalScore: 2, actions: [], lineup: blankLineup },
        { id: '7', setNum: 1, servingTeam: 'our', rotation: 2, phase: 'K2', winner: 'rival', pointType: 'perdido', ourScore: 4, rivalScore: 3, actions: [], lineup: blankLineup },
        { id: '8', setNum: 1, servingTeam: 'our', rotation: 2, phase: 'K2', winner: 'rival', pointType: 'perdido', ourScore: 4, rivalScore: 4, actions: [], lineup: blankLineup },
      ];

      const stats = computeRotationStats(fixtureRallies);
      expect(stats[1].k1Rallies).toBe(2);
      expect(stats[1].k1Wins).toBe(1);
      expect(stats[1].sideOutPct).toBe(50);
      expect(stats[1].k2Rallies).toBe(1);
      expect(stats[1].k2Wins).toBe(1);
      expect(stats[1].breakPointPct).toBe(100);
      expect(stats[1].pointDiff).toBe(1); // 2 ganados - 1 perdido

      expect(stats[2].k1Rallies).toBe(3);
      expect(stats[2].k1Wins).toBe(2);
      expect(stats[2].sideOutPct).toBe(67);
      expect(stats[2].k2Rallies).toBe(2);
      expect(stats[2].k2Wins).toBe(0);
      expect(stats[2].breakPointPct).toBe(0);
      expect(stats[2].pointDiff).toBe(-1); // 2 ganados - 3 perdidos
    });
  });

  describe('computeReceptionStats', () => {
    it('computes reception metrics per player with 5-level quality', () => {
      const blankLineup: LineupMap = { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null };
      const testRallies: Rally[] = [
        {
          id: 'r1', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'our', pointType: 'ganado',
          ourScore: 1, rivalScore: 0, lineup: blankLineup,
          actions: [
            { id: 'a1', ts: 0, phase: 'K1', team: 'our', gesture: 'recepcion', quality: '#', playerId: 'p1' },
            { id: 'a2', ts: 0, phase: 'K1', team: 'our', gesture: 'armado', quality: '+', playerId: 'setter' },
            { id: 'a3', ts: 0, phase: 'K1', team: 'our', gesture: 'ataque', quality: '#', playerId: 'p2' }
          ]
        },
        {
          id: 'r2', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'rival', pointType: 'regalado_nuestro',
          ourScore: 1, rivalScore: 1, lineup: blankLineup,
          actions: [
            { id: 'a4', ts: 0, phase: 'K1', team: 'our', gesture: 'recepcion', quality: '=', playerId: 'p1' }
          ]
        },
        {
          id: 'r3', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'our', pointType: 'ganado',
          ourScore: 2, rivalScore: 1, lineup: blankLineup,
          actions: [
            { id: 'a5', ts: 0, phase: 'K1', team: 'our', gesture: 'recepcion', quality: '+', playerId: 'p1' }
          ]
        },
        {
          id: 'r4', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'our', pointType: 'ganado',
          ourScore: 3, rivalScore: 1, lineup: blankLineup,
          actions: [
            { id: 'a6', ts: 0, phase: 'K1', team: 'our', gesture: 'recepcion', quality: '!', playerId: 'p1' }
          ]
        }
      ];

      const res = computeReceptionStats(testRallies);
      expect(res).toHaveLength(1);
      const p1Stat = res[0];
      expect(p1Stat.playerId).toBe('p1');
      expect(p1Stat.total).toBe(4);
      expect(p1Stat.perfect).toBe(1);
      expect(p1Stat.positive).toBe(1);
      expect(p1Stat.neutral).toBe(1);
      expect(p1Stat.error).toBe(1);
      expect(p1Stat.perfectPct).toBe(25); // 1/4 = 25%
      expect(p1Stat.positivePct).toBe(50); // (1+1)/4 = 50%
      expect(p1Stat.efficiencyPct).toBe(25); // (1+1 - 0 - 1) / 4 = 1/4 = 25%
    });
  });

  describe('computeAttackStats', () => {
    it('computes attack metrics breakdown by player, zone, type and blockers', () => {
      const blankLineup: LineupMap = { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null };
      const testRallies: Rally[] = [
        {
          id: 'r1', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'our', pointType: 'ganado',
          ourScore: 1, rivalScore: 0, lineup: blankLineup,
          actions: [
            {
              id: 'a1', ts: 0, phase: 'K1', team: 'our', gesture: 'ataque', quality: '#', playerId: 'p_attacker',
              detail: { attackZone: 4, attackType: 'rapida', blockers: 2 }
            }
          ]
        },
        {
          id: 'r2', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'rival', pointType: 'regalado_nuestro',
          ourScore: 1, rivalScore: 1, lineup: blankLineup,
          actions: [
            {
              id: 'a2', ts: 0, phase: 'K1', team: 'our', gesture: 'ataque', quality: '=', playerId: 'p_attacker',
              detail: { attackZone: 4, attackType: 'rapida', blockers: 2, errorType: 'bloqueado' }
            }
          ]
        },
        {
          id: 'r3', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'rival', pointType: 'regalado_nuestro',
          ourScore: 1, rivalScore: 2, lineup: blankLineup,
          actions: [
            {
              id: 'a3', ts: 0, phase: 'K1', team: 'our', gesture: 'ataque', quality: '=', playerId: 'p_attacker',
              detail: { attackZone: 2, attackType: 'alta', blockers: 1, errorType: 'fuera' }
            }
          ]
        }
      ];

      const res = computeAttackStats(testRallies);
      expect(res.total.attempts).toBe(3);
      expect(res.total.kills).toBe(1);
      expect(res.total.blocked).toBe(1);
      expect(res.total.errors).toBe(1);
      expect(res.total.efficiencyPct).toBe(-33); // (1 - 1 - 1) / 3 = -33%

      expect(res.byZone[4].attempts).toBe(2);
      expect(res.byZone[4].kills).toBe(1);
      expect(res.byZone[4].blocked).toBe(1);
      expect(res.byZone[4].efficiencyPct).toBe(0); // (1 - 0 - 1) / 2 = 0%

      expect(res.byType.rapida.attempts).toBe(2);
      expect(res.byBlockers[2].attempts).toBe(2);
    });
  });

  describe('computePointsByOrigin', () => {
    it('aggregates points by origin per set and total', () => {
      const blankLineup: LineupMap = { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null };
      const testRallies: Rally[] = [
        { id: '1', setNum: 1, servingTeam: 'our', rotation: 1, phase: 'K2', winner: 'our', pointType: 'ganado', ourScore: 1, rivalScore: 0, actions: [], lineup: blankLineup },
        { id: '2', setNum: 1, servingTeam: 'our', rotation: 1, phase: 'K2', winner: 'our', pointType: 'regalado_rival', ourScore: 2, rivalScore: 0, actions: [], lineup: blankLineup },
        { id: '3', setNum: 1, servingTeam: 'our', rotation: 1, phase: 'K2', winner: 'rival', pointType: 'perdido', ourScore: 2, rivalScore: 1, actions: [], lineup: blankLineup },
        { id: '4', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'rival', pointType: 'regalado_nuestro', ourScore: 2, rivalScore: 2, actions: [], lineup: blankLineup },
        { id: '5', setNum: 2, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'our', pointType: 'ganado', ourScore: 1, rivalScore: 0, actions: [], lineup: blankLineup },
      ];

      const res = computePointsByOrigin(testRallies);
      expect(res).toHaveLength(3); // Set 1, Set 2, Total

      const set1 = res[0];
      expect(set1.setNum).toBe(1);
      expect(set1.ganado).toBe(1);
      expect(set1.regalado_rival).toBe(1);
      expect(set1.totalOurPoints).toBe(2);
      expect(set1.perdido).toBe(1);
      expect(set1.regalado_nuestro).toBe(1);
      expect(set1.totalRivalPoints).toBe(2);

      const total = res[2];
      expect(total.setNum).toBe('total');
      expect(total.ganado).toBe(2);
      expect(total.totalOurPoints).toBe(3);
    });
  });

  describe('computeServeStats', () => {
    it('computes serve metrics by player, type and destinations', () => {
      const blankLineup: LineupMap = { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null };
      const testRallies: Rally[] = [
        {
          id: 'r1', setNum: 1, servingTeam: 'our', rotation: 1, phase: 'K2', winner: 'our', pointType: 'ganado',
          ourScore: 1, rivalScore: 0, lineup: blankLineup,
          actions: [
            { id: 's1', ts: 0, phase: 'K2', team: 'our', gesture: 'saque', quality: '#', playerId: 'p1', detail: { serveType: 'salto', serveTo: 5 } }
          ]
        },
        {
          id: 'r2', setNum: 1, servingTeam: 'our', rotation: 1, phase: 'K2', winner: 'rival', pointType: 'regalado_nuestro',
          ourScore: 1, rivalScore: 1, lineup: blankLineup,
          actions: [
            { id: 's2', ts: 0, phase: 'K2', team: 'our', gesture: 'saque', quality: '=', playerId: 'p1', detail: { serveType: 'salto', errorType: 'fuera' } }
          ]
        },
        {
          id: 'r3', setNum: 1, servingTeam: 'our', rotation: 2, phase: 'K2', winner: 'our', pointType: 'ganado',
          ourScore: 2, rivalScore: 1, lineup: blankLineup,
          actions: [
            { id: 's3', ts: 0, phase: 'K2', team: 'our', gesture: 'saque', quality: '+', playerId: 'p2', detail: { serveType: 'flotado', serveTo: 1 } }
          ]
        }
      ];

      const res = computeServeStats(testRallies);
      expect(res.total.attempts).toBe(3);
      expect(res.total.aces).toBe(1);
      expect(res.total.errors).toBe(1);
      expect(res.total.positive).toBe(1);
      expect(res.total.efficiencyPct).toBe(0); // (1 - 1) / 3 = 0%

      expect(res.byPlayer.p1.attempts).toBe(2);
      expect(res.byPlayer.p1.aces).toBe(1);
      expect(res.byPlayer.p1.errors).toBe(1);

      expect(res.byType.salto.attempts).toBe(2);
      expect(res.byType.flotado.attempts).toBe(1);

      expect(res.destinations[5]).toBe(1);
      expect(res.destinations[1]).toBe(1);
      expect(res.destinations[6]).toBe(0);
    });
  });

  describe('computeSetterDistribution', () => {
    it('computes matrix of previous reception quality x setTarget with percentages', () => {
      const blankLineup: LineupMap = { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null };
      const testRallies: Rally[] = [
        {
          id: 'r1', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'our', pointType: 'ganado',
          ourScore: 1, rivalScore: 0, lineup: blankLineup,
          actions: [
            { id: 'a1', ts: 0, phase: 'K1', team: 'our', gesture: 'recepcion', quality: '#', playerId: 'p1' },
            { id: 'a2', ts: 0, phase: 'K1', team: 'our', gesture: 'armado', quality: '#', playerId: 'setter', detail: { setTarget: 4 } },
            { id: 'a3', ts: 0, phase: 'K1', team: 'our', gesture: 'ataque', quality: '#', playerId: 'p2', detail: { attackZone: 4 } }
          ]
        },
        {
          id: 'r2', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'our', pointType: 'ganado',
          ourScore: 2, rivalScore: 0, lineup: blankLineup,
          actions: [
            { id: 'a4', ts: 0, phase: 'K1', team: 'our', gesture: 'recepcion', quality: '#', playerId: 'p1' },
            { id: 'a5', ts: 0, phase: 'K1', team: 'our', gesture: 'armado', quality: '#', playerId: 'setter', detail: { setTarget: 3 } },
            { id: 'a6', ts: 0, phase: 'K1', team: 'our', gesture: 'ataque', quality: '#', playerId: 'p3', detail: { attackZone: 3 } }
          ]
        },
        {
          id: 'r3', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'rival', pointType: 'regalado_nuestro',
          ourScore: 2, rivalScore: 1, lineup: blankLineup,
          actions: [
            { id: 'a7', ts: 0, phase: 'K1', team: 'our', gesture: 'recepcion', quality: '-', playerId: 'p1' },
            { id: 'a8', ts: 0, phase: 'K1', team: 'our', gesture: 'armado', quality: '!', playerId: 'setter', detail: { setTarget: 4 } }
          ]
        }
      ];

      const res = computeSetterDistribution(testRallies);
      expect(res.totalSets).toBe(3);
      expect(res.totalsByQuality['#']).toBe(2);
      expect(res.totalsByQuality['-']).toBe(1);
      expect(res.matrix['#'][4]).toBe(1);
      expect(res.matrix['#'][3]).toBe(1);
      expect(res.percentages['#'][4]).toBe(50);
      expect(res.percentages['#'][3]).toBe(50);
      expect(res.matrix['-'][4]).toBe(1);
      expect(res.percentages['-'][4]).toBe(100);
    });

    it('solo cuenta si la acción justo anterior al armado es nuestra recepción', () => {
      const blankLineup: LineupMap = { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null };
      const testRallies: Rally[] = [
        // Rally 1: recepción(#) → armado(4) → ataque(!) → punto_rival
        {
          id: 'r1', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'rival', pointType: 'perdido',
          ourScore: 0, rivalScore: 1, lineup: blankLineup,
          actions: [
            { id: 'a1', ts: 1, phase: 'K1', team: 'our', gesture: 'recepcion', quality: '#', playerId: 'p1' },
            { id: 'a2', ts: 2, phase: 'K1', team: 'our', gesture: 'armado', quality: '#', playerId: 'setter', detail: { setTarget: 4 } },
            { id: 'a3', ts: 3, phase: 'K1', team: 'our', gesture: 'ataque', quality: '!', playerId: 'p2', detail: { attackZone: 4 } },
            { id: 'a4', ts: 4, phase: 'K2', team: 'rival', gesture: 'punto_rival', quality: '#', playerId: null }
          ]
        },
        // Rally 2 (contraataque): recepción(#) → armado(4) → ataque(!) → defensa(+) → armado(2)
        // El primer armado cuenta; el segundo armado (tras defensa) NO cuenta
        {
          id: 'r2', setNum: 1, servingTeam: 'rival', rotation: 1, phase: 'K1', winner: 'our', pointType: 'ganado',
          ourScore: 1, rivalScore: 1, lineup: blankLineup,
          actions: [
            { id: 'b1', ts: 1, phase: 'K1', team: 'our', gesture: 'recepcion', quality: '#', playerId: 'p1' },
            { id: 'b2', ts: 2, phase: 'K1', team: 'our', gesture: 'armado', quality: '#', playerId: 'setter', detail: { setTarget: 4 } },
            { id: 'b3', ts: 3, phase: 'K1', team: 'our', gesture: 'ataque', quality: '!', playerId: 'p2', detail: { attackZone: 4 } },
            { id: 'b4', ts: 4, phase: 'K2', team: 'our', gesture: 'defensa', quality: '+', playerId: 'p1' },
            { id: 'b5', ts: 5, phase: 'K2', team: 'our', gesture: 'armado', quality: '+', playerId: 'setter', detail: { setTarget: 2 } },
            { id: 'b6', ts: 6, phase: 'K2', team: 'our', gesture: 'ataque', quality: '#', playerId: 'p3', detail: { attackZone: 2 } }
          ]
        }
      ];

      const res = computeSetterDistribution(testRallies);
      expect(res.totalSets).toBe(2);
      expect(res.matrix['#'][4]).toBe(2);
      expect(res.matrix['#'][2]).toBe(0);
      expect(res.totalsByTarget[4]).toBe(2);
      expect(res.totalsByTarget[2]).toBe(0);
    });
  });
});
