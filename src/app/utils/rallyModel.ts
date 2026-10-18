export type Team = 'our' | 'rival';

/** Escala estándar de 5 niveles */
export type Quality = '#' | '+' | '!' | '-' | '=';

export type Gesture =
  | 'saque' | 'recepcion' | 'armado' | 'ataque'
  | 'dejada' | 'bloqueo' | 'defensa'
  | 'error_rival' | 'punto_rival';

export type Phase = 'K1' | 'K2';           // K1 = side-out (saca el rival), K2 = transición / break point
export type Rotation = 1 | 2 | 3 | 4 | 5 | 6; // zona donde está NUESTRO colocador (P1..P6)
export type CourtZone = 1 | 2 | 3 | 4 | 5 | 6;

export type ServeType = 'flotado' | 'salto' | 'salto_flotado';
export type AttackType = 'alta' | 'rapida' | 'media' | 'pipe' | 'segunda';
export type AttackZone = 4 | 3 | 2 | 1 | 6 | 5;   // 1/6/5 = ataque de zaga
export type SetTarget = 4 | 3 | 2 | 6 | 1;         // 6 = pipe, 1 = zaga derecha
export type ErrorType = 'red' | 'fuera' | 'falta_tecnica' | 'bloqueado' | 'invasion' | 'rotacion';

export interface ActionDetail {
  serveType?: ServeType;
  serveFrom?: 1 | 6 | 5;     // zona de saque (derecha / centro / izquierda)
  serveTo?: CourtZone;       // zona destino en la cancha rival
  attackZone?: AttackZone;
  attackType?: AttackType;
  blockers?: 0 | 1 | 2 | 3;
  setTarget?: SetTarget;
  errorType?: ErrorType;
  pointRivalType?: 'ataque_rival' | 'ace_rival' | 'bloqueo_rival' | 'otro';
}

export interface RallyAction {
  id: string;                // crypto.randomUUID()
  ts: number;                // Date.now()
  team: Team;
  playerId: string | null;   // null en acciones del rival
  rivalNumber?: number | null;
  gesture: Gesture;
  quality: Quality;
  phase: Phase;              // calculada, no la elige el usuario
  detail?: ActionDetail;
}

export type LineupMap = Record<'p1'|'p2'|'p3'|'p4'|'p5'|'p6', string | null>;

export interface Rally {
  id: string;
  setNum: number;
  servingTeam: Team;
  rotation: Rotation;        // rotación al INICIO del rally
  phase: Phase;              // fase del rally = servingTeam === 'rival' ? 'K1' : 'K2'
  winner: Team;
  pointType: 'ganado' | 'regalado_rival' | 'perdido' | 'regalado_nuestro';
  ourScore: number;          // marcador DESPUÉS del punto
  rivalScore: number;
  actions: RallyAction[];
  endLocation?: string;
  impact?: { x: number; y: number; plane: 'court' | 'net' } | null;
  lineup: LineupMap;
}

export interface PlayerLike {
  id: string;
  position?: string;
  name?: string;
}

/**
 * Normaliza cualquier calidad histórica ('pos', 'neu', 'neg', '+', etc.) a la escala estándar #, +, !, -, =
 */
export function normalizeQuality(q: string | Quality | null | undefined): Quality {
  if (!q) return '!';
  if (q === '#' || q === '+' || q === '!' || q === '-' || q === '=') {
    return q;
  }
  const lower = String(q).trim().toLowerCase();
  if (lower === 'pos' || lower === 'perfect' || lower === 'excelente') return '#';
  if (lower === 'neu' || lower === 'neutral' || lower === 'regular') return '!';
  if (lower === 'neg' || lower === 'error' || lower === 'malo') return '=';
  return '!';
}

export interface RallyOutcome {
  isClosed: boolean;
  winner?: Team;
  pointType?: 'ganado' | 'regalado_rival' | 'perdido' | 'regalado_nuestro';
}

/**
 * Determina si una acción cierra el rally y quién gana el punto
 */
export function rallyOutcomeFromAction(action: Pick<RallyAction, 'team' | 'gesture' | 'quality'>): RallyOutcome {
  const q = normalizeQuality(action.quality);

  if (action.team === 'our') {
    if (q === '#' && (action.gesture === 'saque' || action.gesture === 'ataque' || action.gesture === 'dejada' || action.gesture === 'bloqueo')) {
      return { isClosed: true, winner: 'our', pointType: 'ganado' };
    }
    if (q === '=') {
      const g = String(action.gesture).toLowerCase();
      if (g === 'recepcion' || g === 'recepción') {
        return { isClosed: true, winner: 'rival', pointType: 'perdido' };
      }
      return { isClosed: true, winner: 'rival', pointType: 'regalado_nuestro' };
    }
    return { isClosed: false };
  } else {
    // team === 'rival'
    if (action.gesture === 'error_rival' || q === '=') {
      return { isClosed: true, winner: 'our', pointType: 'regalado_rival' };
    }
    if (action.gesture === 'punto_rival' || q === '#') {
      return { isClosed: true, winner: 'rival', pointType: 'perdido' };
    }
    return { isClosed: false };
  }
}

/**
 * Calcula la rotación (P1..P6) según la posición del Colocador en la alineación.
 * Si no hay colocador asignado, calcula en base a rotaciones aplicadas (default 1).
 */
export function computeRotation(
  lineup: LineupMap,
  players: PlayerLike[],
  fallbackRotationCount: number = 0
): Rotation {
  // Buscar qué zona (p1..p6) ocupa un jugador cuya posición contenga "colocador" o "setter" (o 'S')
  const zones: (keyof LineupMap)[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  for (let i = 0; i < zones.length; i++) {
    const zoneKey = zones[i];
    const playerId = lineup[zoneKey];
    if (playerId) {
      const p = players.find(player => player.id === playerId);
      if (p && p.position) {
        const pos = p.position.trim().toLowerCase();
        if (pos === 'colocador' || pos === 'colocadora' || pos === 'armador' || pos === 'armadora' || pos === 'setter' || pos === 's') {
          return (i + 1) as Rotation;
        }
      }
    }
  }

  // Si no se encuentra un colocador explícito, rotar en orden descendente (1 -> 6 -> 5 -> 4 -> 3 -> 2 -> 1)
  const rem = (((1 - (fallbackRotationCount % 6)) % 6) + 6) % 6;
  return (rem === 0 ? 6 : rem) as Rotation;
}

/**
 * Calcula la fase (K1 o K2) para una acción dentro de un rally.
 * En rally K1 (saca el rival), las acciones hasta nuestro primer ataque o dejada inclusive son K1; luego pasan a K2.
 * En rally K2 (sacamos nosotros), todas son K2.
 */
export function computeActionPhase(
  rallyPhase: Phase,
  actionsBefore: Pick<RallyAction, 'team' | 'gesture'>[]
): Phase {
  if (rallyPhase === 'K2') {
    return 'K2';
  }
  // En rally K1: si antes de esta acción ya ocurrió nuestro primer ataque o dejada, es K2
  const hasAttacked = actionsBefore.some(
    a => a.team === 'our' && (a.gesture === 'ataque' || a.gesture === 'dejada')
  );
  return hasAttacked ? 'K2' : 'K1';
}

/**
 * Estadísticas de Side-Out y Break Point por rotación (P1..P6)
 */
export interface RotationStat {
  rotation: Rotation;
  k1Rallies: number;
  k1Wins: number;
  sideOutPct: number;
  k2Rallies: number;
  k2Wins: number;
  breakPointPct: number;
  pointDiff: number; // puntos ganados - puntos perdidos en esta rotación
}

export function computeRotationStats(rallies: Rally[]): Record<Rotation, RotationStat> {
  const result: Record<Rotation, RotationStat> = {
    1: { rotation: 1, k1Rallies: 0, k1Wins: 0, sideOutPct: 0, k2Rallies: 0, k2Wins: 0, breakPointPct: 0, pointDiff: 0 },
    2: { rotation: 2, k1Rallies: 0, k1Wins: 0, sideOutPct: 0, k2Rallies: 0, k2Wins: 0, breakPointPct: 0, pointDiff: 0 },
    3: { rotation: 3, k1Rallies: 0, k1Wins: 0, sideOutPct: 0, k2Rallies: 0, k2Wins: 0, breakPointPct: 0, pointDiff: 0 },
    4: { rotation: 4, k1Rallies: 0, k1Wins: 0, sideOutPct: 0, k2Rallies: 0, k2Wins: 0, breakPointPct: 0, pointDiff: 0 },
    5: { rotation: 5, k1Rallies: 0, k1Wins: 0, sideOutPct: 0, k2Rallies: 0, k2Wins: 0, breakPointPct: 0, pointDiff: 0 },
    6: { rotation: 6, k1Rallies: 0, k1Wins: 0, sideOutPct: 0, k2Rallies: 0, k2Wins: 0, breakPointPct: 0, pointDiff: 0 },
  };

  rallies.forEach(rally => {
    // Ignorar rallies sin rotación definida o fuera del rango 1..6 (no enviarlos a P1)
    if (typeof rally.rotation !== 'number' || rally.rotation < 1 || rally.rotation > 6) {
      return;
    }
    const rot = rally.rotation as Rotation;
    const stat = result[rot];
    const isOurWin = rally.winner === 'our';

    stat.pointDiff += isOurWin ? 1 : -1;

    if (rally.servingTeam === 'rival' || rally.phase === 'K1') {
      stat.k1Rallies++;
      if (isOurWin) stat.k1Wins++;
    } else {
      stat.k2Rallies++;
      if (isOurWin) stat.k2Wins++;
    }
  });

  ([1, 2, 3, 4, 5, 6] as Rotation[]).forEach(rot => {
    const s = result[rot];
    s.sideOutPct = s.k1Rallies > 0 ? Math.round((s.k1Wins / s.k1Rallies) * 100) : 0;
    s.breakPointPct = s.k2Rallies > 0 ? Math.round((s.k2Wins / s.k2Rallies) * 100) : 0;
  });

  return result;
}

/**
 * Etiquetas legibles para la escala de 5 niveles según el gesto
 */
export const QUALITY_LABELS: Record<Gesture, Record<Quality, string>> = {
  saque: {
    '#': 'Ace (Punto)',
    '+': 'Recep. rival mala',
    '!': 'Recep. rival regular',
    '-': 'Recep. rival buena',
    '=': 'Error de saque'
  },
  recepcion: {
    '#': 'Perfecta (#)',
    '+': 'Buena (+)',
    '!': 'Regular (!)',
    '-': 'Mala (-)',
    '=': 'Ace recibido (=)'
  },
  armado: {
    '#': 'Perfecto (#)',
    '+': 'Bueno (+)',
    '!': 'Regular (!)',
    '-': 'Malo (-)',
    '=': 'Error de armado (=)'
  },
  ataque: {
    '#': 'Punto / Kill (#)',
    '+': 'Positivo (+)',
    '!': 'Continuidad (!)',
    '-': 'Negativo (-)',
    '=': 'Error / Bloqueado (=)'
  },
  dejada: {
    '#': 'Punto / Kill (#)',
    '+': 'Positivo (+)',
    '!': 'Continuidad (!)',
    '-': 'Negativo (-)',
    '=': 'Error / Bloqueada (=)'
  },
  bloqueo: {
    '#': 'Punto bloqueo (#)',
    '+': 'Toque contraataque (+)',
    '!': 'Toque neutro (!)',
    '-': 'Toque rival (-)',
    '=': 'Error / Invasión (=)'
  },
  defensa: {
    '#': 'Perfecta (#)',
    '+': 'Buena (+)',
    '!': 'Regular (!)',
    '-': 'Mala (-)',
    '=': 'Error de defensa (=)'
  },
  error_rival: {
    '#': 'Punto',
    '+': 'Positivo',
    '!': 'Neutro',
    '-': 'Negativo',
    '=': 'Error rival'
  },
  punto_rival: {
    '#': 'Punto rival',
    '+': 'Positivo',
    '!': 'Neutro',
    '-': 'Negativo',
    '=': 'Error'
  }
};

/**
 * Estadísticas de recepción por jugadora
 */
export interface PlayerReceptionStat {
  playerId: string;
  total: number;
  perfect: number; // #
  positive: number; // +
  neutral: number; // !
  negative: number; // -
  error: number; // =
  perfectPct: number; // # / total * 100
  positivePct: number; // (# + +) / total * 100
  efficiencyPct: number; // ((# + +) - (-) - (=)) / total * 100
}

export function computeReceptionStats(rallies: Rally[]): PlayerReceptionStat[] {
  const map: Record<string, { total: number; perfect: number; positive: number; neutral: number; negative: number; error: number }> = {};

  rallies.forEach(rally => {
    (rally.actions || []).forEach(action => {
      const g = String(action.gesture).toLowerCase();
      if (action.team === 'our' && (g === 'recepcion' || g === 'recepción') && action.playerId) {
        if (!map[action.playerId]) {
          map[action.playerId] = { total: 0, perfect: 0, positive: 0, neutral: 0, negative: 0, error: 0 };
        }
        const s = map[action.playerId];
        s.total++;
        const q = normalizeQuality(action.quality);
        if (q === '#') s.perfect++;
        else if (q === '+') s.positive++;
        else if (q === '!') s.neutral++;
        else if (q === '-') s.negative++;
        else if (q === '=') s.error++;
      }
    });
  });

  return Object.entries(map).map(([playerId, s]) => {
    const perfectPct = s.total > 0 ? Math.round((s.perfect / s.total) * 100) : 0;
    const positivePct = s.total > 0 ? Math.round(((s.perfect + s.positive) / s.total) * 100) : 0;
    const efficiencyPct = s.total > 0 ? Math.round(((s.perfect + s.positive - s.negative - s.error) / s.total) * 100) : 0;
    return {
      playerId,
      ...s,
      perfectPct,
      positivePct,
      efficiencyPct
    };
  }).sort((a, b) => b.total - a.total);
}

/**
 * Estadísticas de ataque por jugador, zona, tipo y bloqueadores
 */
export interface AttackItemStat {
  attempts: number;
  kills: number; // #
  errors: number; // = (no bloqueado)
  blocked: number; // = (bloqueado)
  efficiencyPct: number; // (kills - errors - blocked) / attempts * 100
}

export interface AttackStatSummary {
  byPlayer: Record<string, AttackItemStat>;
  byZone: Record<AttackZone, AttackItemStat>;
  byType: Record<AttackType, AttackItemStat>;
  byBlockers: Record<0 | 1 | 2 | 3, AttackItemStat>;
  total: AttackItemStat;
}

export function computeAttackStats(rallies: Rally[]): AttackStatSummary {
  const createItem = (): AttackItemStat => ({ attempts: 0, kills: 0, errors: 0, blocked: 0, efficiencyPct: 0 });

  const summary: AttackStatSummary = {
    byPlayer: {},
    byZone: {
      1: createItem(),
      2: createItem(),
      3: createItem(),
      4: createItem(),
      5: createItem(),
      6: createItem()
    },
    byType: {
      alta: createItem(),
      rapida: createItem(),
      media: createItem(),
      pipe: createItem(),
      segunda: createItem()
    },
    byBlockers: {
      0: createItem(),
      1: createItem(),
      2: createItem(),
      3: createItem()
    },
    total: createItem()
  };

  const updateItem = (item: AttackItemStat, q: Quality, isBlocked: boolean) => {
    item.attempts++;
    if (q === '#') item.kills++;
    else if (q === '=') {
      if (isBlocked) item.blocked++;
      else item.errors++;
    }
    item.efficiencyPct = item.attempts > 0
      ? Math.round(((item.kills - item.errors - item.blocked) / item.attempts) * 100)
      : 0;
  };

  rallies.forEach(rally => {
    (rally.actions || []).forEach(action => {
      const g = String(action.gesture).toLowerCase();
      if (action.team === 'our' && (g === 'ataque' || g === 'dejada')) {
        const q = normalizeQuality(action.quality);
        const isBlocked = action.detail?.errorType === 'bloqueado' || (action as any).errorDetail === 'Bloqueado';

        updateItem(summary.total, q, isBlocked);

        if (action.playerId) {
          if (!summary.byPlayer[action.playerId]) summary.byPlayer[action.playerId] = createItem();
          updateItem(summary.byPlayer[action.playerId], q, isBlocked);
        }

        if (action.detail?.attackZone && summary.byZone[action.detail.attackZone]) {
          updateItem(summary.byZone[action.detail.attackZone], q, isBlocked);
        }

        if (action.detail?.attackType && summary.byType[action.detail.attackType]) {
          updateItem(summary.byType[action.detail.attackType], q, isBlocked);
        }

        if (action.detail?.blockers !== undefined && summary.byBlockers[action.detail.blockers]) {
          updateItem(summary.byBlockers[action.detail.blockers], q, isBlocked);
        }
      }
    });
  });

  return summary;
}

/**
 * Puntos por origen (ganados / regalados rival / perdidos / regalados nosotros) por set y total
 */
export interface SetPointsOrigin {
  setNum: number | 'total';
  ganado: number;
  regalado_rival: number;
  totalOurPoints: number;
  perdido: number;
  regalado_nuestro: number;
  totalRivalPoints: number;
}

export function computePointsByOrigin(rallies: Rally[]): SetPointsOrigin[] {
  const bySet: Record<number, SetPointsOrigin> = {};
  const total: SetPointsOrigin = {
    setNum: 'total',
    ganado: 0,
    regalado_rival: 0,
    totalOurPoints: 0,
    perdido: 0,
    regalado_nuestro: 0,
    totalRivalPoints: 0
  };

  rallies.forEach(rally => {
    const setNum = rally.setNum || 1;
    if (!bySet[setNum]) {
      bySet[setNum] = {
        setNum,
        ganado: 0,
        regalado_rival: 0,
        totalOurPoints: 0,
        perdido: 0,
        regalado_nuestro: 0,
        totalRivalPoints: 0
      };
    }
    const s = bySet[setNum];

    let pt = rally.pointType;
    if (!pt) {
      if (rally.winner === 'our') {
        const lastAction = rally.actions?.[rally.actions.length - 1];
        pt = lastAction?.team === 'rival' ? 'regalado_rival' : 'ganado';
      } else {
        const lastAction = rally.actions?.[rally.actions.length - 1];
        pt = lastAction?.team === 'our' ? 'regalado_nuestro' : 'perdido';
      }
    }

    if (rally.winner === 'our') {
      if (pt === 'ganado') {
        s.ganado++;
        total.ganado++;
      } else {
        s.regalado_rival++;
        total.regalado_rival++;
      }
      s.totalOurPoints++;
      total.totalOurPoints++;
    } else {
      if (pt === 'perdido') {
        s.perdido++;
        total.perdido++;
      } else {
        s.regalado_nuestro++;
        total.regalado_nuestro++;
      }
      s.totalRivalPoints++;
      total.totalRivalPoints++;
    }
  });

  const sortedSets = Object.keys(bySet)
    .map(Number)
    .sort((a, b) => a - b)
    .map(setNum => bySet[setNum]);

  return [...sortedSets, total];
}

/**
 * Estadísticas de saque por jugador, tipo y zonas de destino
 */
export interface ServeStatItem {
  attempts: number;
  aces: number;       // #
  positive: number;   // +
  neutral: number;    // !
  negative: number;   // -
  errors: number;     // =
  efficiencyPct: number; // (aces - errors) / attempts * 100
}

export interface ServeStatSummary {
  byPlayer: Record<string, ServeStatItem>;
  byType: Record<ServeType, ServeStatItem>;
  destinations: Record<CourtZone, number>;
  total: ServeStatItem;
}

export function computeServeStats(rallies: Rally[]): ServeStatSummary {
  const createItem = (): ServeStatItem => ({
    attempts: 0,
    aces: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    errors: 0,
    efficiencyPct: 0
  });

  const summary: ServeStatSummary = {
    byPlayer: {},
    byType: {
      flotado: createItem(),
      salto: createItem(),
      salto_flotado: createItem()
    },
    destinations: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    total: createItem()
  };

  const updateItem = (item: ServeStatItem, q: Quality) => {
    item.attempts++;
    if (q === '#') item.aces++;
    else if (q === '+') item.positive++;
    else if (q === '!') item.neutral++;
    else if (q === '-') item.negative++;
    else if (q === '=') item.errors++;
    item.efficiencyPct = item.attempts > 0
      ? Math.round(((item.aces - item.errors) / item.attempts) * 100)
      : 0;
  };

  rallies.forEach(rally => {
    (rally.actions || []).forEach(action => {
      const g = String(action.gesture).toLowerCase();
      if (action.team === 'our' && g === 'saque') {
        const q = normalizeQuality(action.quality);
        updateItem(summary.total, q);

        if (action.playerId) {
          if (!summary.byPlayer[action.playerId]) summary.byPlayer[action.playerId] = createItem();
          updateItem(summary.byPlayer[action.playerId], q);
        }

        const sType = action.detail?.serveType;
        if (sType && summary.byType[sType]) {
          updateItem(summary.byType[sType], q);
        }

        const sTo = action.detail?.serveTo;
        if (sTo && sTo >= 1 && sTo <= 6) {
          summary.destinations[sTo as CourtZone] = (summary.destinations[sTo as CourtZone] || 0) + 1;
        }
      }
    });
  });

  return summary;
}

/**
 * Matriz de distribución del colocador según la calidad de la recepción previa
 */
export interface SetterDistributionMatrix {
  matrix: Record<'#' | '+' | '!' | '-', Record<SetTarget, number>>;
  totalsByQuality: Record<'#' | '+' | '!' | '-', number>;
  totalsByTarget: Record<SetTarget, number>;
  percentages: Record<'#' | '+' | '!' | '-', Record<SetTarget, number>>;
  totalSets: number;
}

export function computeSetterDistribution(rallies: Rally[]): SetterDistributionMatrix {
  const targets: SetTarget[] = [4, 3, 2, 6, 1];
  const qualities: ('#' | '+' | '!' | '-')[] = ['#', '+', '!', '-'];

  const matrix: Record<'#' | '+' | '!' | '-', Record<SetTarget, number>> = {
    '#': { 4: 0, 3: 0, 2: 0, 6: 0, 1: 0 },
    '+': { 4: 0, 3: 0, 2: 0, 6: 0, 1: 0 },
    '!': { 4: 0, 3: 0, 2: 0, 6: 0, 1: 0 },
    '-': { 4: 0, 3: 0, 2: 0, 6: 0, 1: 0 },
  };

  const totalsByQuality: Record<'#' | '+' | '!' | '-', number> = {
    '#': 0, '+': 0, '!': 0, '-': 0
  };

  const totalsByTarget: Record<SetTarget, number> = {
    4: 0, 3: 0, 2: 0, 6: 0, 1: 0
  };

  let totalSets = 0;

  rallies.forEach(rally => {
    const actions = rally.actions || [];
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      const g = String(a.gesture).toLowerCase();
      if (a.team === 'our' && (g === 'armado' || g === 'acomodo') && a.detail?.setTarget) {
        const target = a.detail.setTarget;
        if (!targets.includes(target)) continue;

        // Solo cuenta si la acción justo anterior al armado es nuestra recepción inmediata
        let prevRecQuality: ('#' | '+' | '!' | '-') | null = null;
        if (i > 0) {
          const prev = actions[i - 1];
          const prevG = String(prev.gesture).toLowerCase();
          if (prev.team === 'our' && (prevG === 'recepcion' || prevG === 'recepción')) {
            const nq = normalizeQuality(prev.quality);
            if (qualities.includes(nq as any)) {
              prevRecQuality = nq as ('#' | '+' | '!' | '-');
            }
          }
        }

        if (prevRecQuality) {
          matrix[prevRecQuality][target]++;
          totalsByQuality[prevRecQuality]++;
          totalsByTarget[target]++;
          totalSets++;
        }
      }
    }
  });

  const percentages: Record<'#' | '+' | '!' | '-', Record<SetTarget, number>> = {
    '#': { 4: 0, 3: 0, 2: 0, 6: 0, 1: 0 },
    '+': { 4: 0, 3: 0, 2: 0, 6: 0, 1: 0 },
    '!': { 4: 0, 3: 0, 2: 0, 6: 0, 1: 0 },
    '-': { 4: 0, 3: 0, 2: 0, 6: 0, 1: 0 },
  };

  qualities.forEach(q => {
    const totalQ = totalsByQuality[q];
    targets.forEach(t => {
      percentages[q][t] = totalQ > 0 ? Math.round((matrix[q][t] / totalQ) * 100) : 0;
    });
  });

  return {
    matrix,
    totalsByQuality,
    totalsByTarget,
    percentages,
    totalSets
  };
}
