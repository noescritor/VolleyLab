# Prompt Maestro - App de Análisis de Voleibol

## Contexto del Proyecto
Crea una aplicación web profesional de análisis de voleibol para entrenadores y analistas. La app debe capturar datos en vivo durante partidos y generar insights tácticos automáticamente usando ciencia de datos.

## Arquitectura
- **Frontend**: React + TypeScript + Tailwind CSS V4
- **Backend**: Supabase (PostgREST + Edge Functions + Realtime)
- **Base de datos**: PostgreSQL con vistas materializadas para analítica
- **Responsivo**: Mobile-first, optimizado para tablets en cancha

## Estructura de Navegación
Aplicación de una sola página con pestañas principales:
1. **🏐 Partido** - Match center en vivo
2. **📊 Captura** - Registro rápido de acciones  
3. **👥 Jugadores** - Perfiles y KPIs
4. **📈 Análisis** - Dashboards analíticos
5. **💪 Entrenamiento** - Tests físicos y drills
6. **⚙️ Config** - Equipos y configuración

## Modelo de Datos (Conectar a Supabase)
```sql
-- Tablas principales
teams(id, name, level, gender, created_at)
players(id, team_id, dorsal, name, position, height_cm, reach_cm, is_active)
matches(id, team_id, opponent, date, tournament, venue, status)
sets(id, match_id, number, our_score_final, opp_score_final, result)
rotations(id, set_id, point_number, our_rotation, serving_team, server_player_id)
rallies(id, set_id, point_number, won_by, duration_s)
actions(id, rally_id, seq, team, player_id, action_type, subtype, target_zone, result, quality_0_3, x, y)
player_tests(id, player_id, date, test_type, value, unit)

-- Enums
action_type: serve, receive, set, attack, block, dig, error, substitution, timeout
result: success, fail, point_us, point_opp
position: S, OH, OPP, MB, L, DS
team: us, opp
```

## Pantallas Detalladas

### 1. Pantalla Partido (Match Center)
**Layout**: Header con marcador + Cancha central + Panel lateral de control
- **Header**: Equipos, set actual (1-5), score (25-23), cronómetro, diferencia
- **Cancha 6x6**: Posiciones P1-P6 visuales con nombres de jugadores, líbero destacado
- **Rotación**: Selector 1-6 para nuestra rotación y rival, equipo que sirve
- **Acciones rápidas**: Botones grandes "Punto Nuestro", "Punto Rival", "Timeout", "Cambio"
- **Feed en vivo**: Stream de acciones recientes con timestamps
- **Estado**: Rally activo/inactivo, servidor actual, punto number

### 2. Pantalla Captura
**Layout**: Panel de botones de acción + Selectors + Mini-cancha táctil
- **Botones principales** (2x4 grid):
  - 🏐 Saque | 📡 Recepción | 🤝 Colocación | ⚡ Ataque
  - 🛡️ Bloqueo | 🏃 Defensa | ❌ Error | 🔄 Cambio
- **Selector jugador**: Dropdown con búsqueda por dorsal/nombre + posición
- **Subtipos contextuales**: Aparecen según acción (ej: saque → flotado, topspin, salto)
- **Mini-cancha táctil**: 6 zonas + A/B/C para origen/destino por tap
- **Métricas**: Velocidad (slider), Calidad 0-3 (botones), Resultado (éxito/fallo/punto)
- **Validación**: No permitir captura sin rally activo, secuencia automática

### 3. Pantalla Jugadores
**Layout**: Grid de tarjetas + Filtros + Vista detalle
- **Tarjetas jugador**: Foto, nombre, #dorsal, posición, 3 KPIs principales
- **KPIs clave**:
  - Side-out% cuando recibe
  - Attack EV promedio por zona
  - Error% no forzado
  - Clutch index (rendimiento en momentos decisivos)
  - Última prueba física (salto/reach)
- **Filtros**: Por posición, activo/inactivo, orden por KPI
- **Vista detalle**: Tabs → Resumen, Por Rotación, Por Zona, Tests Físicos, Tendencias

### 4. Pantalla Análisis
**Layout**: Dashboard con 6 widgets analíticos principales
- **Side-out por rotación**: Barras horizontales, % por rot 1-6, trend
- **Mapa de saques**: Heatmap 6 zonas, tasa de ace + punto posterior
- **Calidad recepción**: Stacked bars 0-3 por receptor principal
- **EV de jugadas**: Tabla ordenada [acción + zona + rotación] con Expected Value
- **Comparador**: Seleccionar 2 jugadores, mostrar diferencias de KPIs
- **Recomendador**: Input actual (rotación, colocador, central) → Top-2 jugadas con EV

### 5. Pantalla Entrenamiento
**Layout**: Lista de drills + Sesiones + Gráficos de progreso
- **Drills disponibles**: Cards con nombre, objetivo, dificultad, posición
- **Sesiones recientes**: Fecha, drill, jugadores participantes, métricas
- **Tests físicos**: Form para capturar salto, velocidad, reach, agilidad
- **Progreso individual**: Línea de tiempo por jugador y métrica
- **Comparativas**: Bench del equipo por test type

### 6. Pantalla Configuración
**Layout**: Pestañas para diferentes configuraciones
- **Equipo**: Nombre, nivel, género, jugadores activos
- **Rivales**: Catálogo de equipos contrarios frecuentes
- **Torneos**: Competiciones, fechas, venues
- **Backup**: Export/import de datos, sincronización
- **Usuarios**: Permisos para capturadores, analistas, entrenadores

## Componentes Reutilizables
- **SelectorJugador**: Dropdown con búsqueda, filtro por posición
- **MiniCancha**: Component táctil 6 zonas + click handlers
- **BotonAccion**: Button grande con icono, estado activo, disabled
- **PanelKPIs**: Card con métrica, valor, trend, comparación
- **GraficoTendencia**: Line chart para evolución temporal
- **RotationSelector**: Wheel picker 1-6 con validación

## Design System
- **Colores**: Primary #2563EB, Success #16A34A, Warning #F59E0B, Error #DC2626
- **Tipografía**: System font, 14px base, weights 400/500/700
- **Spacing**: 8px base scale (8, 16, 24, 32)
- **Cards**: Rounded 16px, shadow subtle, padding 24px
- **Botones**: 44px+ táctil, rounded 12px, estados hover/active/disabled
- **Inputs**: Background #f3f3f5, border focus, labels claras

## Estados y Validaciones
- **Rally state**: inactivo → activo → cerrado (con botón reset)
- **Offline**: Cola local + sync cuando vuelve conexión
- **Validaciones**: Acción sin rally, jugador no en cancha, secuencia duplicada
- **Realtime**: Updates automáticos del score via Supabase channels
- **Cache**: KPIs pesados en localStorage, TTL 5 min

## Métricas de Analítica (Ciencia de Datos)
```javascript
// Side-out percentage por rotación
SELECT rotation, AVG(won_by='us') FROM rallies WHERE serving_team='opp' GROUP BY rotation

// Expected Value por jugada
SELECT action_type, subtype, zone, AVG(CASE result WHEN 'point_us' THEN 1 WHEN 'fail' THEN -1 ELSE 0 END) as EV

// Clutch performance (score diff ≤ 2, últimos 10 puntos)
SELECT player, AVG(success_rate) FROM actions WHERE clutch_moment=true vs normal

// Consistency (varianza del rendimiento)
SELECT player, VAR(performance) FROM player_match_stats GROUP BY player
```

## API Integration (Supabase)
```typescript
// Endpoints principales
GET /teams, /players, /matches, /sets, /rallies, /actions
POST /actions (captura), /rallies (nuevo punto), /substitutions
PUT /rotations (cambio rotación), /players (update stats)

// Realtime subscriptions
supabase.channel('match_updates').on('INSERT', {table: 'actions'}, callback)
supabase.channel('scores').on('UPDATE', {table: 'sets'}, updateScore)

// Edge Functions
/api/analytics/sideout?rotation=1&match_id=123
/api/recommendations?rotation=3&setter_id=456&available_players=[1,2,3]
/api/clutch-analysis?player_id=789&timeframe=30d
```

## Casos de Uso Principales
1. **Captura en vivo**: Entrenador registra cada acción durante partido
2. **Análisis post-partido**: Review de KPIs, zonas débiles, rotaciones clave
3. **Preparación rival**: Analizar tendencias del oponente, zonas de ataque
4. **Desarrollo jugador**: Tracking de progreso, identificar áreas de mejora
5. **Decisiones tácticas**: Recomendador sugiere jugadas según situación

## Performance Requirements
- **Captura**: Acción registrada en <2 segundos (táctil optimizado)
- **Analytics**: Dashboards cargan en <3 segundos (vistas materializadas)
- **Realtime**: Updates de score en <1 segundo (Supabase channels)
- **Offline**: Funciona sin internet, sync automático al reconectar
- **Mobile**: Responsive 390px+, botones 44px+, accesible

## Entregables Esperados
1. **App funcional** con todas las pantallas navegables
2. **Conexión Supabase** configurada con CRUD operations
3. **Data mocks** para testing si no hay DB conectada
4. **Responsive design** mobile/tablet optimizado
5. **Componentes reutilizables** bien estructurados
6. **Estados offline** implementados
7. **Validaciones** de negocio activas

## Prompt de Testing
"Simula un partido Búfalos vs Tigres, crea 2 sets con datos realistas, registra 10 acciones por set incluyendo saques, ataques y errores. Muestra que los dashboards analíticos funcionan con datos reales."

---

**IMPORTANTE**: Implementa primero el flujo principal (Partido → Captura → Análisis) antes que funciones secundarias. Prioriza UX en captura rápida y visualización clara de KPIs.