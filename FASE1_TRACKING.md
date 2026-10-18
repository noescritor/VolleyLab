# Fase 1 — Tracking en vivo completo

Especificación para implementar en `LiveMatchCenter.tsx` + `MatchAnalytics.tsx`.
Objetivo: que cada rally guarde los datos que necesitan los reportes profesionales (side-out por rotación, eficiencia real de recepción/ataque, puntos ganados vs regalados, tendencias del colocador), sin que la captura en vivo se vuelva lenta.

**No improvisar el modelo de datos.** Si algo de aquí no cabe, preguntar antes de cambiarlo.

---

## 0. Principios

1. **Lógica pura fuera del componente.** Todo cálculo (rotación, fase, desenlace del rally, normalización) va en `src/app/utils/rallyModel.ts` como funciones puras con tipos estrictos — sin `any`.
2. **Dos modos de captura**, elegidos en la pantalla de setup:
   - **Rápido** — gesto + calidad (5 niveles) + rotación/fase automáticas + errores rivales.
   - **Completo** — además pide los detalles opcionales (secciones 4, 5 y 6).
   En modo Completo **todo detalle es saltable**: un toque en "Saltar" o en otro gesto continúa sin bloquear.
3. **Compatibilidad hacia atrás.** Los partidos ya guardados (calidades `pos/neu/neg`, sin `schemaVersion`) deben seguir viéndose en Analytics y en el PDF.
4. **Design system Moodboard Kit 3.0.** Íconos solo de Lucide (cambiar también el `⚠️` del modal de error y el `✕` de cancelar). Botones táctiles de mínimo 44px de alto. Colores de la paleta.

---

## 1. Modelo de datos (v2)

En `src/app/utils/rallyModel.ts`:

```ts
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
  lineup: Record<'p1'|'p2'|'p3'|'p4'|'p5'|'p6', string | null>;
}
```

`match_metadata` debe guardar `schemaVersion: 2` y `captureMode: 'rapido' | 'completo'`.

---

## 2. Escala de 5 niveles

Reemplaza los 3 botones `+ • −` por 5. Significado por gesto:

| Gesto | `#` | `+` | `!` | `-` | `=` |
|---|---|---|---|---|---|
| Saque | Ace (punto) | Recepción rival mala | Recepción rival regular | Recepción rival buena | Error de saque (punto rival) |
| Recepción | Perfecta | Buena | Regular | Mala (sin primer tiempo) | Ace recibido (punto rival, perdido) |
| Armado | Perfecto | Bueno | Regular | Malo | Error (punto rival) |
| Ataque | Punto | Bueno (el rival defiende mal) | Continuidad | Malo | Error o bloqueado (punto rival) |
| Dejada | igual que Ataque | | | | |
| Bloqueo | Punto de bloqueo | Toque que deja contraataque | Toque neutro | Toque que deja contraataque rival | Error / invasión (punto rival) |
| Defensa | Perfecta | Buena | Regular | Mala | Error (punto rival) |

**Reglas de cierre del rally** (función `rallyOutcomeFromAction(action)`):
- `#` en saque, ataque, dejada o bloqueo → **punto nuestro**, `pointType = 'ganado'`.
- `=` en recepción → **punto rival**, `pointType = 'perdido'` (ace recibido; no abre modal de error).
- `=` en cualquier otro gesto nuestro → **punto rival**, `pointType = 'regalado_nuestro'`. Abre el modal de tipo de error (red / fuera / falta técnica / bloqueado / invasión), según el gesto.
- Cualquier otro nivel → el rally **sigue**.

Botones: símbolo grande + etiqueta corta abajo, que cambia según el gesto activo (ej. en Recepción, `#` dice "Perfecta").

**Compatibilidad** — `normalizeQuality(q)`: `pos → '#'`, `neu → '!'`, `neg → '='`. Analytics y el PDF usan **solo** calidades normalizadas.

---

## 3. Rotación y fase (automáticas)

- **Rotación** (`computeRotation(lineup, players)`): zona en la que está el jugador con `position === 'Colocador'`. `p1 → 1`, `p2 → 2` … `p6 → 6`.
  Si no hay colocador en cancha, usar la rotación del inicio del set + número de rotaciones aplicadas, módulo 6.
  Mostrar la rotación actual en el header en vivo (`P1`–`P6`, DM Mono, mayúsculas).
- **Fase del rally**: `servingTeam === 'rival' ? 'K1' : 'K2'`.
- **Fase de cada acción** (`computeActionPhase(rally, index)`): en un rally K1, las acciones hasta nuestro **primer** ataque o dejada (inclusive) son `K1`; las siguientes son `K2`. En un rally K2, todas son `K2`.

---

## 4. Errores y puntos del rival

Hoy "Punto nuestro / Punto rival" (`quickScore`) cierra el rally sin explicar por qué. Cámbialo por dos menús:

**Botón "Punto nuestro" →** ¿cómo?
- *Error rival*: saque fuera · saque a la red · ataque fuera · ataque a la red · invasión / red · falta técnica → crea una acción `{ team: 'rival', gesture: 'error_rival', quality: '=', detail.errorType }`; `pointType = 'regalado_rival'`.
- *Lo ganamos nosotros* → pide el jugador y el gesto, y registra la acción con `#`.

**Botón "Punto rival" →** ¿cómo?
- *Ataque rival* · *Ace rival* · *Bloqueo rival* · *Otro* → acción `{ team: 'rival', gesture: 'punto_rival', quality: '#' }` con el tipo en `detail`; `pointType = 'perdido'`.
- *Error nuestro* → pide jugador y gesto y registra `=`; `pointType = 'regalado_nuestro'`.

`rivalNumber` es opcional: un teclado numérico chico que se puede saltar.

---

## 5. Detalle de saque y ataque (solo modo Completo)

**Saque nuestro** — al elegir calidad en "Saque":
1. Chips de tipo: Flotado · Salto · Salto-flotado. **Recuerda el último tipo usado por cada jugador** y lo preselecciona.
2. Chips de zona de origen: 1 · 6 · 5.
3. Destino: tocar la cancha (reusar `CourtHeatmap` + `getZoneFromXY`) → `serveTo`.

**Ataque / dejada nuestros:**
1. Zona de ataque: 4 · 3 · 2 · zaga 1 · pipe 6 · zaga 5. Por defecto viene del `setTarget` del armado anterior, si existe.
2. Tipo: Alta · Rápida · Media · Pipe · Segunda.
3. Bloqueadores enfrente: 0 · 1 · 2 · 3.
4. Si la calidad es `=`, `errorType` incluye la opción "bloqueado".

---

## 6. Distribución del colocador (solo modo Completo)

Al registrar "Armado": chips de destino 4 · 3 · 2 · Pipe · Zaga → `setTarget`.
Es lo que permite el reporte "¿a dónde arma según la calidad de la recepción?" (sección 7).

---

## 7. Analytics y reporte

Agregar a `MatchAnalytics` (y al PDF) — todo con funciones puras en `rallyModel.ts`:

1. **Side-out y break point por rotación** — tabla P1–P6: rallies K1, % de side-out, rallies K2, % de break point, balance de puntos.
2. **Recepción** — por jugador: total, `#%` (perfecta), positiva `(#+ +)%`, eficiencia `(# + + − − − =) / total`.
3. **Ataque** — por jugador, por zona, por tipo y por número de bloqueadores: intentos, puntos, errores, bloqueados, eficiencia `(puntos − errores − bloqueados) / intentos`.
4. **Puntos por origen** — ganados / regalados por el rival / perdidos / regalados por nosotros, por set.
5. **Saque** — por jugador y tipo: aces, errores, eficiencia, mapa de destino (`serveTo`).
6. **Distribución del colocador** — matriz: calidad de la recepción previa (`#`, `+`, `!`, `-`) × `setTarget`, con %.

Cada sección muestra un empty state si el partido se capturó en modo Rápido o es anterior a v2.

---

## 8. Pruebas

Agregar `vitest` (devDependency) y `npm run test`. Tests unitarios para `rallyModel.ts`:
- `normalizeQuality` (calidades viejas y nuevas)
- `rallyOutcomeFromAction` (cada gesto × cada calidad)
- `computeRotation` (con colocador y sin colocador)
- `computeActionPhase` (rally K1 con contraataque, rally K2)
- Side-out por rotación con un partido fixture de ~20 rallies

---

## 9. Orden de commits

1. `feat(f1): modelo v2 + rallyModel.ts + normalizeQuality + tests`
2. `feat(f1): escala de 5 niveles en captura`
3. `feat(f1): rotación y fase automáticas (+ indicador en header)`
4. `feat(f1): menús de punto nuestro/rival con errores del rival`
5. `feat(f1): modo rápido/completo`
6. `feat(f1): detalle de saque`
7. `feat(f1): detalle de ataque y bloqueadores`
8. `feat(f1): distribución del colocador`
9. `feat(f1): analytics — rotación, recepción, ataque, origen de puntos`
10. `feat(f1): analytics — saque y distribución + PDF`

Después de cada commit: `npm run typecheck`, `npm run test` y `npm run build`. Sin push.
