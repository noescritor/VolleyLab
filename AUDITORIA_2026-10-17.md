# Auditoría VolleyLab — 2026-10-17

Alcance: todo el código en `main` (26 commits, último `e07b6ec` del 2026-08-06), migraciones SQL, edge functions y la base Supabase en producción (`rdedbpwydbgsxsmwhfjg`, solo lectura y con la llave pública).
Build: `vite build` compila sin errores (bundle JS de 1.26 MB). **No hay TypeScript configurado** (no hay `typescript` ni `tsconfig`), así que ningún error de tipos se detecta nunca.

Severidad: 🔴 crítico · 🟠 alto · 🟡 medio · ⚪ bajo

---

## 1. Seguridad y datos

### 🔴 1.1 Cualquier persona en internet puede leer todos los jugadores, sin iniciar sesión
- Política `global_players` → `FOR SELECT USING (true)` (`src/app/supabase/migrations/000_master_saas_sports_schema.sql:198`).
- Verificado en producción: con la llave anónima (la que viaja en el JS público) la tabla devuelve **158 filas** sin login. Incluye `name`, `birth_date`, `height_cm`, `weight_kg` — probablemente de menores de edad.
- **Arreglo:** limitar SELECT a `auth_user_id = auth.uid()` o a jugadores que estén en `club_roster` de una org donde el usuario sea miembro. Para el "buscar jugador por ID" usar una función RPC `SECURITY DEFINER` que solo devuelva `id` + `name` dado un `global_athlete_id` exacto.

### 🔴 1.2 Llave `service_role` en un archivo que NO está en `.gitignore`
- `test_trigger_simulation.ts` contiene la llave `service_role` en texto plano, está sin trackear y no aparece en `.gitignore`. Un `git add .` la sube a GitHub (`noescritor/VolleyLab`) y da control total de la base.
- Los otros scripts (`test_*.ts`, `debug_trigger.ts`, `e2e_test.ts`) también la tienen, pero sí están ignorados. Se verificó que la llave nunca se ha commiteado.
- **Hecho en esta auditoría:** se agregó `test_trigger_simulation.ts` al `.gitignore`.
- **Recomendado:** mover la llave a `.env` (`SUPABASE_SERVICE_ROLE_KEY`) y leerla con `process.env` en todos los scripts; borrar los scripts que ya no se usan.

### 🟠 1.3 Las migraciones del repo no corresponden a la base real
- Producción tiene 13 tablas (`global_players`, `club_roster`, `teams`, `matches`, `match_segments`, `actions`, `player_tests`, `orgs`, `org_members`…) = esquema `000`.
- Las migraciones `001` (tablas en español: `partidos`, `sets`, `rallies`, `eventos`…), `002` y `004` crean/alteran tablas que **no existen** en producción. Correrlas en orden sobre una base nueva da un esquema distinto (y con conflictos) al de producción.
- Riesgo: la migración `001:460` tiene una política en `org_members` con `WITH CHECK (auth.uid() = user_id …)` que permitiría a cualquier usuario **insertarse como admin de cualquier club**. Hoy no parece aplicada, pero si alguien la corre, queda abierta.
- **Arreglo:** sacar un dump real (`supabase db dump --schema public`) como migración base única y archivar 001–004 en `/legacy`.

### 🟠 1.4 Dos triggers distintos en `auth.users` → clubes duplicados y las invitaciones no funcionan
- `005_auth_trigger.sql` crea `on_auth_user_created_trigger` (invitación o club nuevo) y `006` crea **otro** trigger `on_auth_user_created` (siempre club nuevo). Si se aplicaron ambos, cada registro dispara los dos: un usuario invitado queda en el club que lo invitó **y además** en un "Club de X" nuevo como admin.
- Además el `000` usa el mismo nombre que `005` para crear `global_players`; el `005` lo reemplaza y el perfil global ya no se crea.
- **Arreglo:** un solo trigger que haga: crear `global_players` → si hay `pre_registros`, unirse a esa org; si no, crear org propia.

### 🟡 1.5 Al cerrar sesión no se limpia nada local
- `handleSignOut` (`src/app/App.tsx:257`) solo llama `signOut()`. Quedan `currentOrgId` y `volleyLab_liveMatch` en localStorage.
- En un dispositivo compartido, el siguiente usuario hereda el org del anterior (`supabaseService.ts:18` lo usa sin validar) y ve el partido en vivo de otra persona.
- **Arreglo:** borrar `currentOrgId`, `volleyLab_liveMatch` y `volleyball-offline-queue` en el logout; validar en `getUserOrg()` que el org guardado pertenece al usuario.

### ⚪ 1.6 Edge server KV sin autenticación (no desplegado)
- `supabase/functions/server/index.tsx` expone CRUD sin validar usuario, usando `service_role`. Hoy responde 404 (no está desplegado), pero `utils/api.ts` lo sigue usando como "fallback" cuando no hay org. **Eliminar** el server y el fallback.

---

## 2. Bugs funcionales — Live Match (lo más reciente de Anty)

### 🔴 2.1 El timeline (cambios y tiempos fuera) nunca se guarda
- `endMatch` manda `timeline` (`LiveMatchCenter.tsx:835`, con comentario "Save the timeline history!"), pero `AppContext.createMatch` solo guarda `notes/result/score/rallies` en `match_metadata` (`AppContext.tsx:441-446`), y `convertSupabaseMatchToLegacy` tampoco lo lee.
- Efecto: la pestaña **Timeline** y el cálculo de **impacto de sustituciones** en Analytics siempre salen vacíos para partidos reales.

### 🔴 2.2 Los rallies no guardan el marcador ni el set
- `newRally` (`LiveMatchCenter.tsx:736-743` y `689-695`) no incluye `ourScore`, `rivalScore` ni `setNum`.
- `MatchAnalytics` sí los usa (`MatchAnalytics.tsx:77-85`): la gráfica de **momentum** muestra `undefined-undefined` / `NaN`, y la frecuencia de errores por fase pone todo en "Inicio (0-15)". Tampoco se puede separar nada por set.

### 🔴 2.3 Side-out % y Transición % son inventados
- El Live Match no registra quién saca. Los saques rivales no generan acción, así que esos rallies caen al heurístico `idx % 2` (`MatchAnalytics.tsx:97-100`): un rally par = side-out, uno impar = transición. El KPI principal es prácticamente aleatorio, igual que el "histórico" (`:194-203`).
- **Arreglo:** guardar `servingTeam: 'our' | 'rival'` en cada rally (se deduce del ganador del rally anterior) y rotar automáticamente al ganar el side-out.

### 🟠 2.4 "Deshacer" no deshace el rally
- `snap()` (`LiveMatchCenter.tsx:613-616`) no guarda `allRallies` ni `timeline`. Al deshacer un punto baja el marcador pero el rally sigue en las estadísticas → marcador y stats dejan de coincidir.

### 🟠 2.5 Al terminar el partido, el auto-guardado lo "revive" al recargar
- El auto-guardado solo escribe cuando `screen !== "setup"` (`:589-598`) y nadie borra la key. Tras `endMatch`, localStorage conserva el último estado "live" → al recargar, la pantalla vuelve al partido ya terminado y se puede guardar **dos veces**.
- Además `createMatch` en AppContext **se traga el error** (`AppContext.tsx:455-458`, solo hace toast), así que `endMatch` siempre resetea aunque el guardado haya fallado.

### 🟡 2.6 Gestos que se registran pero no cuentan
- El Live Match usa `armado` y `defensa` (`LiveMatchCenter.tsx:47-55`). Analytics solo cuenta `defensa`/`acomodo` en la rama de datos seed (`MatchAnalytics.tsx:172-177`), no en la de acciones reales (`:103-138`). Armados y defensas desaparecen de las stats.

### 🟡 2.7 Fecha del partido en UTC
- `new Date().toISOString().split('T')[0]` (`:829`): un partido después de las 18:00 en México se guarda con fecha del día siguiente.

### ⚪ 2.8 Menores
- `resultStr` puede ser `'D'` pero el tipo es `'W' | 'L'` (`:824`).
- `callTimeout` hace `pushH()` antes de validar el límite (`:771`) → "deshacer" vacío.
- No se valida fin de set (25 con diferencia de 2, 15 en el 5º).

---

## 3. Bugs funcionales — resto de la app

| Sev | Dónde | Problema |
|---|---|---|
| 🔴 | `AppContext.tsx:649` | `supabaseService.clearAllData()` **no existe** → el botón de limpiar base en `TestPage` truena siempre con TypeError. |
| 🟠 | `supabaseService.ts:227-250` | `updatePlayer` y `removePlayerFromRoster` no revisan `error`. Siempre sale "Jugador actualizado" aunque falle. Y como los jugadores "ghost" tienen `auth_user_id = null`, la política UPDATE de `global_players` (`auth_user_id = auth.uid()`) **bloquea** editar nombre/estatura/peso → falla silenciosamente siempre. |
| 🟠 | `PerformanceReports.tsx:94-140` | Los reportes por posición, tests y clutch son `Math.random()`. Se muestran como si fueran datos reales del jugador. |
| 🟡 | `LoadManagement.tsx:28-38` | Carga, RPE, sueño, dolor… todo aleatorio. |
| 🟡 | `supabaseService.ts:195` | ID ghost `VLL-GHOST-` + 4 dígitos aleatorios → colisiones con ~100 jugadores. |
| 🟡 | `supabaseService.ts:17-37` | `getUserOrg` toma el primer org y lo cachea para siempre; el `ClubSelector` cambia la key pero los datos ya cargados no se recargan. |
| ⚪ | `useUserProfile` / `App.tsx` | El diálogo deja editar el "rol", pero solo cambia en pantalla; al recargar vuelve. |

---

## 4. Design system (Moodboard Kit 3.0)

- **Light mode roto:** el toggle pone/quita `.dark` en `<html>`, pero los componentes tienen **~570 clases oscuras fijas** (`bg-[#0d0d0d]`, `text-white`, `bg-black`…). En light quedan bloques negros sobre fondo blanco. Hay que migrar a los tokens `--bg-*`/`--text-*` con `data-theme`, como dice la variante Light (sin `filter: invert`, que hoy no se usa ✅).
- **Colores fuera de paleta** frecuentes: `#5A6070` (46 usos, texto gris), `#2E4A72` (38), `#11141A`, `#0A0C10`, `#FFAC91`, `#FF6B35`, `#2563EB`, `#16A34A`, `#DC2626`, `#F59E0B`. Sustituir por `white/40`, `white/25` y los accents oficiales.
- `LiveMatchCenter.tsx:510-516` inyecta las fuentes de Google en cada montaje; deberían ir una sola vez en `index.html`.
- Accents ✅: `#A191FF`, `#91FFB0`, `#FF919F`, `#FFD391`, `#91CAFF` se usan bien en la mayoría.

---

## 5. Calidad de código y mantenimiento

- **Sin TypeScript real:** todo es `any` (LiveMatchCenter y MatchAnalytics casi completos). Instalar `typescript` + `tsconfig` estricto y un script `npm run typecheck`.
- **Código muerto grande:** `MatchCenter.tsx` (897 líneas) + `match-center/*`, `liveMatchAPI.ts`, `volleyballAnalytics.ts`, `useMatchState.ts`, edge functions `create-match` / `ingest-event` / `manage-substitution` → todos apuntan a tablas que no existen en producción.
- **Dependencias sin usar** que inflan el bundle/instalación: `@mui/material`, `@mui/icons-material`, `@emotion/*`, `react-dnd`, `react-slick`, `react-responsive-masonry`, `motion`, `hono`.
- **Bundle de 1.26 MB** en un solo chunk → hacer `lazy()` por pestaña (Analytics, Reports, Live Match).
- Imports con versión en la ruta (`'sonner@2.0.3'`) dependen de alias en `vite.config.ts`; normalizar a `'sonner'`.
- `dist/` ya está ignorado ✅; logs `[DEBUG]` con datos en `supabaseService.ts:359-400` deberían quitarse.
- Datos de partido guardados como JSON en `matches.match_metadata.rallies` en lugar de `match_segments`/`actions` → no se puede consultar ni agregar por SQL.

---

## 6. Orden sugerido para Anty

1. 🔴 Cerrar la política de `global_players` (1.1) — hoy.
2. 🔴 Llaves a `.env` y limpiar scripts (1.2).
3. 🔴 Live Match: guardar `timeline`, `ourScore/rivalScore/setNum/servingTeam` por rally; propagar el error de `createMatch`; limpiar localStorage al terminar (2.1, 2.2, 2.3, 2.5).
4. 🟠 Undo completo (2.4) y conteo de `armado`/`defensa` (2.6).
5. 🟠 Unificar el trigger de registro (1.4) y la migración base real (1.3).
6. 🟠 Errores silenciosos en jugadores + política UPDATE para ghosts (sección 3).
7. 🟡 Marcar o quitar los datos aleatorios de Reports/Load.
8. 🟡 Design system: tokens para light mode y colores fuera de paleta.
9. ⚪ TypeScript, código muerto, dependencias, code-splitting.

---

## Estado

### 1. Seguridad y datos
- **1.1 Política RLS abierta en `global_players`:** ✅ corregido — Se crearon las migraciones `008_secure_global_players_rls.sql` y `010_create_ghost_player_rpc.sql` (y se actualizó `000_master_saas_sports_schema.sql`), cerrando `SELECT` a `auth_user_id = auth.uid()` o miembros activos de una organización que tenga al jugador en `club_roster`, eliminando cualquier política directa de `INSERT` sobre `global_players`, y gestionando la creación de jugadores ghost mediante la función RPC `SECURITY DEFINER` `public.create_ghost_player` que valida membresía y pertenencia del equipo a la organización. Se creó además la función RPC `SECURITY DEFINER` `public.find_player_by_athlete_id(target_athlete_id text)` que devuelve únicamente `id` y `name`, y se actualizó `supabaseService.addPlayerToRoster` para usarla.
- **1.2 Llave `service_role` expuesta en scripts:** ✅ corregido — Se eliminaron los scripts obsoletos sin uso (`debug_trigger.ts`, `test_auth.ts`, `test_db.ts`, `test_trigger_simulation.ts`) y en `e2e_test.ts` y `test_rls.ts` se reemplazó la llave hardcodeada por lectura desde `process.env.SUPABASE_SERVICE_ROLE_KEY`. Se documentó la variable en `.env.example`.
- **1.3 Migraciones 001–004 incompatibles con producción:** ✅ corregido — Se movieron `001_volleyball_live_match_schema.sql`, `002_update_rls_policies.sql` y `004_saas_multi_tenant_migration.sql` a `src/app/supabase/migrations/legacy/` y se consolidó el esquema real de producción en `000_master_saas_sports_schema.sql`.
- **1.4 Triggers duplicados en `auth.users`:** ✅ corregido — Se creó la migración `009_unify_auth_trigger_and_ghost_update.sql` que elimina los triggers duplicados (`on_auth_user_created_trigger`, `on_auth_user_created`, `handle_new_user_signup`) y deja un único trigger `public.on_auth_user_created()` que crea el perfil en `global_players`, une al usuario a la organización si existe invitación en `pre_registros`, o crea su propia organización como `admin`.
- **1.5 Limpieza de `localStorage` en logout y validación de org:** ✅ corregido — `handleSignOut` en `src/app/App.tsx` ahora elimina `currentOrgId`, `volleyLab_liveMatch` y `volleyball-offline-queue`. `getUserOrg()` en `src/app/utils/supabaseService.ts` valida que `storedOrgId` pertenezca realmente al usuario autenticado en `org_members`.
- **1.6 Edge server KV sin autenticación y fallback en `api.ts`:** ✅ corregido — Se eliminaron `src/app/supabase/functions/server/`, `src/app/utils/api.ts` y el fallback KV en `src/app/utils/AppContext.tsx`.

### 2. Bugs funcionales — Live Match y Analytics
- **2.1 Timeline nunca se guarda ni se lee:** ✅ corregido — `AppContext.createMatch` guarda `timeline` en `match_metadata` y `convertSupabaseMatchToLegacy` lo restaura al cargar partidos.
- **2.2 Rallies sin `ourScore`, `rivalScore` ni `setNum`:** ✅ corregido — Cada rally registrado en `LiveMatchCenter.tsx` incluye `ourScore`, `rivalScore` (marcador posterior al punto) y `setNum`.
- **2.3 Side-out % y Transición % heurísticos (`idx % 2`):** ✅ corregido — Cada rally guarda `servingTeam: 'our' | 'rival'` deducido del ganador del rally anterior en el set o de la selección de saque inicial en alineación (`firstServingTeam`, con botones que usan el ícono `Volleyball` de Lucide en vez de emojis), rotando automáticamente la alineación (`rotateLineup`) al ganar el side-out. `MatchAnalytics.tsx` calcula Side-out % y Transición % reales con `servingTeam` y se eliminó el heurístico `idx % 2`.
- **2.4 Undo (`snap`) no restaura `allRallies` ni `timeline`:** ✅ corregido — `snap()` y `undo()` en `LiveMatchCenter.tsx` ahora guardan y restauran `allRallies` y `timeline`.
- **2.5 Auto-guardado revive partido terminado y `createMatch` traga el error:** ✅ corregido — `AppContext.createMatch` relanza el error (`throw error;`) y `endMatch` en `LiveMatchCenter.tsx` solo resetea el estado y borra `volleyLab_liveMatch` de `localStorage` cuando el guardado tuvo éxito.
- **2.6 Gestos `armado` y `defensa` no contados en acciones reales:** ✅ corregido — `MatchAnalytics.tsx` ahora contabiliza `defensa` (`s.digs[q]++`) y `armado`/`acomodo` (`s.sets[q]++`) en la rama de acciones reales, en el filtro por jugadora y en el cálculo de eficacia total.
- **2.7 Fecha del partido en UTC (`toISOString()`):** ✅ corregido — Se reemplazó `toISOString().split('T')[0]` por fecha local (`getLocalDateString()`) en `LiveMatchCenter.tsx`.
- **2.8 Menores (`resultStr`, `callTimeout`, etc.):** ✅ corregido — `callTimeout` en `LiveMatchCenter.tsx` valida el límite de 2 tiempos fuera antes de llamar a `pushH()`. `endMatch` guarda `'D'` en `result` si los sets quedan empatados, y tanto `Dashboard.tsx` como `MatchAnalytics.tsx:455` muestran la etiqueta "Empate" con color `#FFD391`. `AppContext.updateMatch` hace merge preservando `rallies` y `timeline` existentes. (Validación automática de fin de set ⏸ pendiente).

### 3. Bugs funcionales — Resto de la app
- **`supabaseService.clearAllData()` inexistente:** ✅ corregido — Se implementó `clearAllData()` en `src/app/utils/supabaseService.ts` para limpiar los registros de la organización activa en orden seguro de llaves foráneas.
- **`updatePlayer` y `removePlayerFromRoster` sin manejo de error + bloqueo RLS en jugadores ghost:** ✅ corregido — Ambos métodos ahora verifican `error` y lanzan excepción. En `009_unify_auth_trigger_and_ghost_update.sql` se añadió la política RLS `UPDATE` en `global_players` para permitir a miembros del club editar jugadores ghost (`auth_user_id IS NULL`) de su `club_roster`. Además, en `010_create_ghost_player_rpc.sql` se implementó la función RPC `SECURITY DEFINER` `create_ghost_player` para crear el jugador ghost e insertarlo en `club_roster` en una sola transacción atómica, evitando el bloqueo RLS de `008`.
- **`PerformanceReports.tsx` con `Math.random()`:** ✅ corregido — Se eliminaron todas las llamadas a `Math.random()`, calculando las métricas desde datos reales (`physicalTests` y `matches`) o mostrando un empty state explícito cuando no hay registros.
- **`LoadManagement.tsx` con `Math.random()`:** ✅ corregido — Se eliminó la generación aleatoria de datos y se reemplazó por persistencia real en `localStorage` (`volleylab_load_logs`) con formulario de registro de sesión (RPE/bienestar) y empty state claro cuando no existen sesiones registradas.
- **Colisiones en ID ghost (`supabaseService.ts:195`):** ✅ corregido — Se reemplazó el sufijo aleatorio de 4 dígitos por `crypto.randomUUID()` (`VLL-GHOST-${crypto.randomUUID()}` y `gen_random_uuid()` en SQL).
- **Recarga en `ClubSelector` / edición de rol en `useUserProfile`:** ⏸ pendiente — Fuera del alcance explícito.

### 4. Design system (Moodboard Kit 3.0)
- **Light mode con CSS custom properties (`data-theme` y `color-scheme`, sin `filter: invert()`):** ✅ corregido — Se configuraron las variables `--bg-*` y `--text-*` para `data-theme="dark"` y `data-theme="light"` con `color-scheme` en `src/styles/globals.css`, `index.html` y `src/app/App.tsx`.
- **Colores fuera de paleta (`#5A6070`, `#2E4A72`, `#11141A`, `#0A0C10`, `#FFAC91`, `#FF6B35`, `#2563EB`, `#16A34A`, `#DC2626`, `#F59E0B`):** ✅ corregido — Reemplazados en todos los componentes por los tokens oficiales del Moodboard Kit 3.0 (`#A191FF`, `#91FFB0`, `#FF919F`, `#FFD391`, `#91CAFF` y opacidades de blanco/superficie).
- **Inyección duplicada de Google Fonts en `LiveMatchCenter.tsx`:** ✅ corregido — Se eliminó la inyección dinámica de `<link>` en `LiveMatchCenter.tsx`, manteniendo la carga única en `index.html`.

### 5. Calidad de código y mantenimiento
- **Instalar TypeScript con `tsconfig.json` estricto y script `typecheck`:** ✅ corregido — Se instaló `typescript`, se creó `tsconfig.json` con `"strict": true` y se agregó `"typecheck": "tsc --noEmit"` en `package.json` (pasa con 0 errores).
- **Eliminar código muerto (`MatchCenter.tsx`, `match-center/*`, `liveMatchAPI.ts`, `volleyballAnalytics.ts`, `useMatchState.ts`, edge functions obsoletas):** ✅ corregido — Eliminados todos los archivos y funciones que apuntaban a tablas inexistentes.
- **Quitar dependencias sin usar (`@mui/*`, `@emotion/*`, `react-dnd`, `react-slick`, `react-responsive-masonry`, `motion`, `hono`):** ✅ corregido — Desinstaladas de `package.json` y `package-lock.json`.
- **Code-splitting con `lazy()` por pestaña:** ✅ corregido — Implementado `React.lazy()` y `<Suspense>` por pestaña en `src/app/App.tsx`.
- **Normalizar imports con versión (`'sonner@2.0.3'`, etc.) y quitar logs `[DEBUG]`:** ✅ corregido — Se normalizaron todos los imports en `src/app/components/ui/*`, se limpiaron los alias en `vite.config.ts` y se eliminaron los logs `[DEBUG]` en `src/app/utils/supabaseService.ts`.
- **Migrar `matches.match_metadata.rallies` a filas relacionales en `match_segments`/`actions`:** ⏸ pendiente — Fuera del alcance de los bloques solicitados (requiere refactor estructural del modelo de lectura/escritura de partidos).

### 6. Fase 1 — Tracking en Vivo (`FASE1_TRACKING.md`)
- **1. Modelo de datos v2 + `rallyModel.ts` + `normalizeQuality` + tests unitarios (`vitest`):** ✅ corregido — Se implementaron los tipos y funciones puras (`normalizeQuality`, `rallyOutcomeFromAction`, `computeRotation`, `computeActionPhase`, etc.) en `src/app/utils/rallyModel.ts` sin `any`. Se integró `vitest` y suite de pruebas unitarias (`rallyModel.test.ts`).
- **2. Escala de 5 niveles en captura (`#`, `+`, `!`, `-`, `=`):** ✅ corregido — En `LiveMatchCenter.tsx`, se reemplazó el selector de 3 niveles por la escala de 5 niveles con etiquetas tácticas contextuales por gesto (`QUALITY_LABELS`).
- **3. Rotación y fase automáticas (+ indicador en header):** ✅ corregido — Detección automática de rotación `P1` a `P6` con colocador y seguimiento de fase (`K1`/`K2`), renderizado en header con tipografía DM Mono.
- **4. Menús de punto nuestro / rival con errores del rival:** ✅ corregido — Modales interactivos para cerrar rallies registrando mérito propio o errores no forzados del rival (saque fuera/red, ataque fuera/red, invasión, etc.) con selección opcional de dorsal rival.
- **5. Selector de modo de captura (Rápido vs Completo):** ✅ corregido — Configurable en la pantalla de inicio del partido y persistido en `match_metadata.captureMode`.
- **6. Detalle de saque (modo Completo):** ✅ corregido — Selector de tipo de saque (`flotado`, `salto`, `salto_flotado`), zona de origen (`1`, `6`, `5`) y zona destino rival (`serveTo`), recordando el último tipo usado por cada jugadora.
- **7. Detalle de ataque y bloqueadores (modo Completo):** ✅ corregido — Zona de ataque (`4`, `3`, `2`, `1`, `6`, `5`) con valor por defecto heredado del `setTarget` previo, tipo de balón (`alta`, `rapida`, `media`, `pipe`, `segunda`), conteo de bloqueadores (`0`–`3`) y error bloqueado.
- **8. Distribución del colocador (modo Completo):** ✅ corregido — Registro de destino de colocación (`setTarget`: `4`, `3`, `2`, `6`, `1`) en gestos de armado.
- **9. Analytics de Fase 1 (Rotación P1–P6, Recepción, Ataque, Origen de Puntos):** ✅ corregido — Pestaña "Táctica & Rotación" en `MatchAnalytics.tsx` con tablas de métricas puras calculadas desde `rallyModel.ts` y empty states específicos para modo rápido y partidos legados.
- **10. Analytics de Saque y Distribución del Colocador + Reporte PDF:** ✅ corregido — Matriz de distribución del colocador según la calidad de la recepción previa (`#`, `+`, `!`, `-`) × `setTarget` con porcentajes, desglose de saque por jugadora, tipo y zonas de destino `serveTo`, y página 5 en el reporte imprimible (`PrintableMatchReport.tsx`).

### 7. Revisión Fase 1 — Tracking en Vivo
- **1. Rotación en confirmEndOfRally:** ✅ corregido — En `LiveMatchCenter.tsx:1030` se pasa `rotationCount` a `computeRotation` al confirmar el fin de rally, alineado con los otros cierres de punto. Test unitario en `rallyModel.test.ts`. (commit `4bd68bb`)
- **2. computeSetterDistribution recepción previa inmediata:** ✅ corregido — La búsqueda de recepción previa en un armado se detiene en la primera acción no inmediata (`i - 1`). No cuenta armados en contraataques si hubo acciones intermedias como defensa. Test unitario en `rallyModel.test.ts`. (commit `58d12b8`)
- **3. Recepción con calidad '=' (ace recibido):** ✅ corregido — Cierra directamente el rally como punto rival con `pointType: 'perdido'` sin abrir modal de tipo de error nuestro. Se actualizó `rallyOutcomeFromAction` y la tabla de la sección 2 de `FASE1_TRACKING.md`. Test unitario en `rallyModel.test.ts`. (commit `8062314`)
- **4. computeRotation sin colocador descendente (1 → 6 → 5 → 4 → 3 → 2 → 1):** ✅ corregido — Con `rotationCount: 0` devuelve `1` (P1) y desciende cíclicamente en el orden de rotación de voleibol mediante la fórmula `(((1 - count) % 6) + 6) % 6` mapeando 0 a 6. Test unitario en `rallyModel.test.ts`. (commit `3e997d8`)
- **5. MatchAnalytics isV2 e ignorar rallies sin rotation en computeRotationStats:** ✅ corregido — `isV2` verifica la existencia de `rotation` definido en los rallies. `computeRotationStats` ignora rallies sin rotación válida (no los envía a P1). Test unitario en `rallyModel.test.ts`. (commit `bf9b9eb`)
