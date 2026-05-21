# Prompts Específicos por Módulo

## 1. Prompt Pantalla Partido (Match Center)

Crea una pantalla "Partido" para captura en vivo con:

**Header del partido**: Rival, torneo, set actual, marcador grande (25-23), cronómetro en tiempo real, diferencia de puntos destacada.

**Cancha central 6x6**: Grid visual con posiciones P1-P6, nombres de jugadores en cada posición, líbero diferenciado visualmente, arrastrables para cambios de rotación.

**Panel de rotación**: Controles para nuestra rotación (1-6) y rival (1-6), indicador visual de quién sirve, servidor actual destacado.

**Acciones rápidas**: Botones grandes táctiles:
- "Punto Nuestro" (verde, prominent)
- "Punto Rival" (rojo) 
- "Timeout" (amarillo)
- "Cambio" (azul)
- "Siguiente Rally" (púrpura)

**Feed de acciones**: Lista en tiempo real de acciones recientes con timestamps, jugador, acción, resultado.

**Estados**: Rally activo/inactivo visual, punto actual, secuencia de acciones del rally.

Conecta a Supabase tables: matches, sets, rotations, rallies. Include realtime updates via Supabase channels. Al cerrar rally, crear nuevo registro en rallies table y reset sequence.

---

## 2. Prompt Pantalla Captura

Crea una pantalla "Captura" optimizada para registro rápido en cancha:

**Panel de acciones principales** (grid 2x4, botones 60px altura):
- 🏐 Saque | 📡 Recepción | 🤝 Colocación | ⚡ Ataque
- 🛡️ Bloqueo | 🏃 Defensa | ❌ Error | 🔄 Cambio

**Selector de jugador**: Dropdown searchable por dorsal (#1, #7) o nombre, con badge de posición (S, OH, MB, etc).

**Subtipos contextuales**: Aparecen según acción seleccionada:
- Saque: Flotado, Topspin, Salto, Lateral
- Ataque: Remate, Finta, Dejada, Globo
- Bloqueo: Simple, Doble, Triple, Foul

**Mini-cancha táctil**: 6 zonas (1-6) + zonas traseras (A,B,C) para origen/destino. Click handlers para capturar coordenadas x,y.

**Métricas de acción**:
- Velocidad: Slider 0-120 km/h
- Calidad: Botones 0-3 (0=error, 1=malo, 2=bueno, 3=perfecto) 
- Resultado: Radio buttons (Éxito, Fallo, Punto Nuestro, Punto Rival)

**Botón Guardar**: Prominente, inserta en actions table con seq=max(seq)+1 del rally actual.

**Validaciones**: No permitir captura sin rally activo, mostrar jugador actual esperado, validation feedback.

Conecta a tables: actions, rallies, players. Auto-increment sequence, timestamp automático.

---

## 3. Prompt Pantalla Jugadores

Crea pantalla "Jugadores" con grid de tarjetas y vista detalle:

**Grid de jugadores** (responsive, 2-3 columnas):
- Foto placeholder circular
- Nombre y apellido
- Dorsal destacado (#1, #7, #10)
- Badge de posición (S, OH, OPP, MB, L, DS) con colores
- 3 KPIs principales con iconos:
  - 📈 Side-out% cuando recibe
  - ⚡ Attack EV promedio
  - 🎯 Error% no forzado

**Controles de filtro**:
- Por posición: All, S, OH, OPP, MB, L, DS
- Estado: Activos, Inactivos, Todos
- Ordenar por: Nombre, Posición, Side-out%, Attack EV

**Vista detalle del jugador** (modal o página):
Tabs navegables:
1. **Resumen**: KPIs generales, últimos 5 partidos, tendencia
2. **Por Rotación**: Performance por rot 1-6, side-out rate, attack zones
3. **Por Zona**: Heatmap de efectividad de ataque por zona 1-6
4. **Tests Físicos**: Últimas pruebas (salto, reach, velocidad), gráfico temporal
5. **Tendencias**: Line charts de evolución de KPIs

**KPIs calculados**:
- Side-out%: (puntos ganados / recepciones en saque rival) * 100
- Attack EV: AVG(punto=1, error=-1, otros=0) por ataque
- Clutch index: Rendimiento en score diff ≤ 2 vs normal
- Consistencia: 1 - (varianza / media) del rendimiento

Conecta a vw_player_attack_efficiency, vw_reception_quality, player_tests tables.

---

## 4. Prompt Pantalla Análisis

Crea dashboard analítico con 6 widgets principales:

**1. Side-out por Rotación**:
Gráfico de barras horizontales, rotaciones 1-6 en Y, porcentaje 0-100% en X. Colores: >70% verde, 50-70% amarillo, <50% rojo. Include trend arrows.

**2. Mapa de Saques**:
Heatmap de cancha rival (6 zonas), intensidad por cantidad de saques, overlay con % de ace y % de punto posterior. Tooltip con detalles.

**3. Calidad de Recepción**:
Stacked bar chart por receptor principal, distribución calidad 0-3. Legend: 0=rojo, 1=naranja, 2=amarillo, 3=verde.

**4. Expected Value de Jugadas**:
Tabla ordenada con columnas: Acción, Subtipo, Zona, EV, Sample Size. Filtrable por rotación, jugador, oponente. EV coloreado: >0.5 verde, 0-0.5 amarillo, <0 rojo.

**5. Comparador de Jugadores**:
Selector de 2 jugadores (dropdown), radar chart con 6 métricas: Attack%, Block%, Reception%, Service%, Clutch%, Consistency%. Diferencias destacadas.

**6. Recomendador de Jugadas**:
Input: Rotación actual (1-6), Colocador disponible (dropdown), Central disponible (dropdown).
Output: Top-2 jugadas con mayor EV, probabilidad estimada, botón "Marcar Jugada" para tracking.

**Filtros globales**: Partido específico, últimos N partidos, vs oponente específico, set específico.

Conecta a vistas materializadas: vw_sideout_by_rotation, vw_player_attack_efficiency, vw_serve_heatmap, vw_reception_quality.

---

## 5. Prompt Pantalla Entrenamiento

Crea módulo de entrenamiento y tests físicos:

**Lista de Drills** (cards scrollables):
- Nombre del drill
- Objetivo (velocidad, precisión, resistencia)
- Dificultad: Basic/Intermediate/Advanced
- Posición focus: All/S/OH/MB/etc
- Equipamiento necesario
- Métricas a capturar

**Sesiones de Entrenamiento**:
- Form para nueva sesión: Fecha, drill seleccionado, jugadores participantes
- Lista de sesiones recientes con resultados
- Duración e intensidad (Low/Medium/High/Max)

**Tests Físicos**:
Form de captura rápida:
- Jugador (dropdown)
- Test type: Salto vertical, Salto horizontal, Sprint 20m, Agilidad, Reach, VO2 Max
- Valor + unidad (cm, segundos, ml/kg/min)
- Condiciones: En frío, Calentado, Post-entrenamiento
- Notas adicionales

**Dashboard de Progreso**:
- Line charts por jugador y test type
- Comparativa con promedios del equipo
- Ranking del equipo por test
- Tendencias y mejoras/declives
- Correlación entre tests físicos y rendimiento en cancha

**Alerts**: Detectar declives en performance, sugerir tests de seguimiento, recordatorios de evaluación periódica.

Conecta a tables: drills, drill_sessions, drill_results, player_tests.

---

## 6. Prompt Pantalla Configuración

Crea pantalla de configuración con tabs:

**Tab Equipo**:
- Datos básicos: Nombre, nivel (junior/senior/pro), género, logo upload
- Lista de jugadores actuales con toggle activo/inactivo
- Add/Edit player: Nombre, dorsal, posición, datos físicos, foto
- Validaciones: Dorsal único, máximo 1 líbero activo

**Tab Rivales**:
- Catálogo de equipos rivales frecuentes
- Historial de enfrentamientos
- Notas tácticas por rival
- Tendencias y patterns observados

**Tab Torneos**:
- Competiciones actuales y pasadas
- Fechas importantes, venues
- Formato de competición (liga, copa, playoff)
- Objetivos por torneo

**Tab Datos**:
- Export/Import de datos (JSON, CSV)
- Backup automático settings
- Sync status con Supabase
- Data cleanup tools (archivar partidos antiguos)

**Tab Usuarios** (si aplica):
- Roles: Admin, Analista, Capturador, Solo lectura
- Permisos por pantalla
- Audit log de cambios importantes

**Tab Sistema**:
- Configuración de notificaciones
- Idioma y formato de fecha
- Temas claro/oscuro
- Cache settings y performance

Incluir validaciones, confirmaciones para acciones destructivas, y feedback visual para cambios guardados.

---

## Instrucciones Generales para Todos los Módulos

1. **Mobile-first responsive**: Diseñar para tablet en cancha, escalar a desktop
2. **Táctil optimizado**: Botones 44px+, areas de tap generosas, gestos intuitivos
3. **Performance**: Lazy loading, virtualization para listas largas, memoización
4. **Offline support**: Cola local, sync cuando vuelve conexión, status visible
5. **Validaciones**: UX feedback inmediato, prevenir estados inconsistentes
6. **Accesibilidad**: Labels claras, contraste suficiente, navegación por teclado
7. **Loading states**: Skeletons, spinners apropiados, no pantallas en blanco
8. **Error handling**: Mensajes user-friendly, opciones de recovery
9. **Data consistency**: Optimistic updates con rollback, conflict resolution
10. **Analytics tracking**: Usage metrics para optimización continua