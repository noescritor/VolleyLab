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

  // Si no se encuentra un colocador explícito, usar rotación base + rotaciones aplicadas
  const rot = ((fallbackRotationCount % 6) + 6) % 6;
  return (rot === 0 ? 6 : rot) as Rotation;
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
    const rot = (rally.rotation >= 1 && rally.rotation <= 6 ? rally.rotation : 1) as Rotation;
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
