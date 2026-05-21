# Setup Completo - Sistema Profesional de Análisis de Voleibol

## 🏐 Resumen del Sistema

Has implementado un sistema completo de análisis de voleibol con:

- **Base de datos normalizada** en Supabase con 13+ tablas
- **Analítica avanzada** con vistas materializadas y funciones SQL
- **Dashboard profesional** con 6 widgets de ciencia de datos
- **Match Center** funcional para captura en vivo
- **Datos de prueba** completos para testing inmediato

## 🚀 Pasos de Implementación

### 1. Configurar Supabase

```bash
# 1. Crear proyecto en supabase.com
# 2. Ejecutar migraciones en SQL Editor (orden importante):

# Paso 1: Esquema principal
/supabase/migrations/002_volleyball_pro_schema.sql

# Paso 2: Funciones avanzadas
/supabase/migrations/003_analytics_functions.sql

# Paso 3: Datos de prueba
/supabase/seed_data.sql
```

### 2. Variables de Entorno

```env
# Crear archivo .env.local
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Instalar Dependencias

```bash
npm install @supabase/supabase-js recharts
```

### 4. Navegación en la App

La app ahora tiene estas pestañas principales:

1. **Dashboard** - KPIs generales del equipo
2. **Jugadores** - Gestión y perfiles de jugadores  
3. **Tests** - Pruebas físicas y seguimiento
4. **Partidos** - Historial de partidos
5. **🧠 Análisis** - ✨ **NUEVO Dashboard Analítico**
6. **⚡ En Vivo** - Match Center para captura en vivo
7. **Carga** - Gestión de carga de entrenamiento
8. **Reportes** - Reportes y exports
9. **Test** - Herramientas de desarrollo

## 📊 Dashboard Analítico (Nueva Pestaña)

### Widgets Implementados:

1. **Side-out por Rotación**
   - Barras horizontales por rotación 1-6
   - Colores: Verde >70%, Amarillo 50-70%, Rojo <50%
   - Tendencias históricas

2. **Mapa de Saques**
   - Heatmap de cancha 6 zonas
   - % de ace por zona
   - Probabilidad de punto posterior

3. **Expected Value por Jugada**
   - Top 10 jugadas ordenadas por EV
   - Jugador, posición, zona objetivo
   - Kill% y error% por jugada

4. **Calidad de Recepción**
   - Area chart por receptor
   - Distribución de calidad 0-3
   - Opciones de ataque generadas

5. **Comparador de Jugadores**
   - Radar chart con 6 métricas
   - Selección dual de jugadores
   - Comparación visual directa

6. **Recomendador de Jugadas**
   - Input: Rotación + Colocador
   - Output: Top-3 recomendaciones
   - EV estimado y probabilidad

## 🔬 Métricas de Ciencia de Datos

### Implementadas y Funcionales:

- **Side-out %**: `SELECT AVG(won_by='us') FROM rallies WHERE serving_team='opp'`
- **Expected Value**: `AVG(CASE result WHEN 'point_us' THEN 1 WHEN 'fail' THEN -1 ELSE 0 END)`
- **Clutch Performance**: Rendimiento en score diff ≤ 2 vs normal
- **Attack Efficiency**: Kill%, Error%, EV por zona y jugador
- **Serve Targeting**: Efectividad por zona + punto posterior
- **Reception Quality**: Distribución 0-3 + opciones generadas
- **Consistency**: Varianza del rendimiento por jugador
- **Momentum**: Weighted score últimos 5 puntos

### Funciones SQL Avanzadas:

```sql
-- Todas implementadas y listas para usar
get_clutch_performance()
get_play_recommendations(rotation, setter, players, score_diff, set_num)
get_subsequent_point_win_rate(target_zone)
get_player_consistency(player_id, action_type)
get_zone_analysis(match_id)
get_match_momentum(set_id, window_size)
```

## 📱 Flujo de Uso Completo

### Captura en Vivo:
1. **Match Center** → Configurar equipos y rotaciones
2. **Iniciar rally** → Capturar acciones secuenciales
3. **Terminar rally** → Asignar punto y rotar automáticamente
4. **Auto-guardado** en Supabase en tiempo real

### Análisis Post-Partido:
1. **Análisis** tab → Ver todos los widgets analíticos
2. **Comparar jugadores** → Radar chart de rendimiento
3. **Recomendaciones** → Sugerencias para próximo partido
4. **Export** → Datos para entrenador principal

### Preparación Táctica:
1. **Side-out analysis** → Identificar rotaciones vulnerables
2. **Serve targeting** → Zonas efectivas contra rival
3. **Player matching** → Optimizar lineups por EV
4. **Clutch players** → Quién juega en momentos clave

## 🗄️ Estructura de Base de Datos

### Tablas Principales (13):
- `teams` - Equipos
- `players` - Jugadores con datos físicos
- `matches` - Partidos programados/jugados
- `sets` - Sets por partido (1-5)
- `rotations` - Estado de rotación por punto
- `rallies` - Cada rally individual
- `actions` - Cada acción en el rally (saque, ataque, etc)
- `player_tests` - Pruebas físicas
- `drills` - Catálogo de ejercicios
- `drill_sessions` - Sesiones de entrenamiento
- `drill_results` - Resultados por jugador
- `tags` - Etiquetas para clasificar
- `analytics_cache` - Cache de consultas pesadas

### Vistas Materializadas (4):
- `vw_sideout_by_rotation` - Side-out % por rotación
- `vw_player_attack_efficiency` - Eficiencia de ataque
- `vw_serve_heatmap` - Mapa de saques
- `vw_reception_quality` - Calidad de recepción

## 🎯 Datos de Prueba Incluidos

El sistema viene con datos completos de prueba:

- **Equipo**: Búfalos Volley (12 jugadores)
- **Partido**: vs Tigres Unidos (3 sets completos)
- **Acciones**: 100+ acciones reales con secuencias
- **Tests**: Salto vertical, sprint 20m por jugadores
- **Drills**: 3 ejercicios con resultados
- **Métricas**: Todas las vistas calculadas con datos reales

## 🚀 Siguientes Pasos

### Inmediatos:
1. ✅ Conectar Supabase con credenciales reales
2. ✅ Probar flujo completo de captura
3. ✅ Verificar que analítica carga datos
4. ✅ Testear recomendador de jugadas

### A Corto Plazo:
1. **Realtime**: Suscripciones para updates en vivo
2. **Offline**: Queue local + sync automático
3. **Mobile UX**: Optimizar para tablets en cancha
4. **Exports**: PDF reports para entrenadores
5. **Rival Analysis**: Comparación vs equipos históricos

### Extensiones Avanzadas:
1. **Computer Vision**: Auto-tracking de jugadas
2. **ML Predictions**: Probabilidades de jugadas ganadoras
3. **Load Management**: Integración con wearables
4. **Multi-tenant**: Múltiples equipos en una instancia

## 📞 Soporte

Para implementación con Make de Figma, usar el **prompt maestro**:
- `/prompts/volleyball-master-prompt.md` - Prompt completo
- `/prompts/module-prompts.md` - Prompts por pantalla específica

## 🏆 Resultado Final

Tienes un sistema profesional de análisis de voleibol con:

- ✅ **Base de datos normalizada** (13 tablas + vistas)
- ✅ **Analítica de ciencia de datos** (8+ métricas)
- ✅ **Dashboard interactivo** (6 widgets)
- ✅ **Captura en vivo** (Match Center funcional)
- ✅ **Datos de prueba** (partido completo)
- ✅ **Prompt optimizado** (para Make de Figma)

**¡Listo para usar en cancha!** 🏐