import { describe, it, expect } from 'vitest';
import {
  normalizeQuality,
  rallyOutcomeFromAction,
  computeRotation,
  computeActionPhase,
  computeRotationStats,
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

    it('cierra punto para rival en = de cualquier gesto nuestro', () => {
      const gestures = ['saque', 'recepcion', 'armado', 'ataque', 'dejada', 'bloqueo', 'defensa'] as const;
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
});
