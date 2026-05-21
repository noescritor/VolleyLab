# 🚀 Live Match Center - Guía de Uso

## Sistema Ultra-Rápido de Captura Táctil

El nuevo **Live Match Center** está optimizado para cero teclado y máximo dos toques por acción, diseñado para uso con una sola mano durante partidos en vivo.

---

## 🎯 Principios UX

### ✅ **Cero Teclado**
- Todo se maneja por iconos y gestos
- Selects y chips para opciones
- Taps en cancha interactiva

### ✅ **Dos Toques Máximo**
1. **Primer toque**: Seleccionar acción (saque, ataque, etc.)
2. **Segundo toque**: Zona de aterrizaje (si aplica)

### ✅ **Control con una Mano**
- Controles grandes (44-56px)
- Bottom sheets accesibles
- Gestos intuitivos

### ✅ **Estados Claros**
- 🔴 Rally inactivo
- 🟢 Rally en juego  
- ⚪ Rally cerrado

### ✅ **Deshacer Relámpago**
- Toast con botón "Deshacer" por 3 segundos
- Historial de acciones

### ✅ **Offline First**
- Cola local automática
- Sincronización cuando hay conexión
- Indicador de estado

---

## 🏐 Flujo de Captura

### **Ejemplo: Remate Rival**

1. **Tap** en icono "Ataque" (se marca como equipo rival automáticamente)
2. **Tap** en MiniCancha donde aterrizó el balón en nuestra cancha
3. **Opcional**: Chips de contexto (¿hubo toque de bloqueo? ¿zona de remate rival?)
4. **Auto-guardado** al cerrar rally con resultado

### **Ejemplo: Nuestro Saque**

1. **Tap** en icono "Saque" (se marca como nosotros automáticamente)  
2. **Tap** en zona objetivo en cancha rival
3. **Mantener presionado** para modo avanzado (tipo de saque, velocidad)
4. Rally se inicia automáticamente

---

## 🎮 Gestos y Atajos

### **Marcador (Gestos en el Score)**
- **Swipe derecha** → Punto nuestro
- **Swipe izquierda** → Punto rival  
- **Mantener presionado** → Tiempo fuera (inicia timer 60s)

### **Iconos de Acción**
- **Tap** → Acción rápida básica
- **Mantener 600ms** → Modo Pro con subtipos

### **MiniCancha**
- **Tap simple** → Marca zona de aterrizaje
- **Doble tap** → "Fuera" (te pregunta lado: izq/der/fondo)
- **Arrastrar** → Vector trayectoria (opcional)

---

## 🏐 MiniCancha Inteligente

### **Zonas de la Cancha**
```
Cancha (vista desde nuestro lado):
[4F] [3F] [2F]  ← Front row (cerca de la red)
[5B] [6B] [1B]  ← Back row (fondo)
```

### **Áreas Fuera**
- **Fuera Izq** → Lateral izquierdo
- **Fuera Der** → Lateral derecho  
- **Fuera Fondo** → Línea de fondo

### **Capas de Interacción**
1. **Nuestra cancha** → Para aterrizajes de ataques rivales
2. **Cancha rival** → Para nuestros ataques/saques
3. **Áreas fuera** → Con indicadores visuales

---

## ⚡ Modo Pro (Captura Avanzada)

### **Activación**
- Mantener presionado cualquier icono de acción por 600ms
- O deslizar hacia arriba el panel de acción

### **Opciones por Acción**

#### **🏐 Saque**
- **Tipo**: flotado, topspin, salto, corto
- **Objetivo**: zonas 1-6
- **Velocidad**: baja, media, alta

#### **📥 Recepción** 
- **Calidad**: 0-3 (sistema internacional)
- **Receptor**: P1-P6
- **Tipo**: directa, lateral, emergency

#### **⚡ Ataque**
- **Tempo**: corta, slide, pipe, BIC, alta
- **Zona origen**: 2, 3, 4, pipe
- **Altura contacto**: baja, media, alta
- **Contra quién**: 1v1, doble, triple, libre

#### **🛡️ Bloqueo**
- **Tipo**: solo, doble, triple
- **Toque**: sí/no
- **Resultado**: punto, ralentiza, desvío

#### **❌ Error**
- **Causa**: red, fuera, antena, doble, cuatro toques
- **Tipo**: saque, ataque, recepción, colocación, bloqueo

---

## 🔄 Sustituciones Sin Dolor

### **Interface Drag & Drop**
- **Tira superior**: Cancha (P1-P6 + Líbero)
- **Tira inferior**: Banca
- **Arrastrar**: Jugador de banca → posición en cancha

### **Validaciones Automáticas**
- ✅ Máximo 6 + líbero en cancha
- ✅ Límites de cambios por set
- ✅ Diferencia cambio normal vs líbero in/out

### **Historial Visual**
- Últimas 5 sustituciones con minuto y punto
- Botón "Revertir" última sustitución (antes del siguiente saque)

### **Líbero Especial**
- Botón "Líbero In/Out" que no consume cambio normal
- Indicador visual diferenciado
- Tracking automático de entradas/salidas

---

## 📊 Info Mínima Siempre Visible

### **Header**
- Equipos y marcador
- Set actual (1/5)
- Rotación actual
- Servidor actual
- Estado de conexión

### **Chips de Estado**
- Rally activo/inactivo
- Diferencia de puntos
- Racha actual (🔥 +3)
- Side-out % actual

### **KPIs en Vivo**
- Side-out por rotación
- Eficiencia servidor rival
- Streak momentum
- Clutch situations

---

## 🔧 Base de Datos (Nuevas Columnas)

### **Tabla `actions` (extendida)**
```sql
-- Ubicación mejorada
landing_zone TEXT,          -- '1F','5B','fuera_izq','fuera_der','fondo'  
landing_x NUMERIC,          -- 0..1 normalizado
landing_y NUMERIC,          -- 0..1 normalizado

-- Detalles de ataque rival
opp_attack_zone TEXT,       -- '2','4','pipe','bic'
block_touch BOOLEAN,        -- ¿hubo toque de bloqueo?
net_touch BOOLEAN,          -- ¿toque en red?

-- Trayectoria (opcional)
trajectory JSONB,           -- [{"x":0.8,"y":0.2},{"x":0.2,"y":0.1}]

-- Tempo y tipo
tempo TEXT,                 -- 'corta','slide','pipe','bic','alta'
error_cause TEXT;           -- 'red','fuera','antena','doble','cuatro'
```

### **Tabla `substitutions` (nueva)**
```sql
CREATE TABLE substitutions(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID REFERENCES sets(id) ON DELETE CASCADE,
  point_number INT,
  from_player_id UUID REFERENCES players(id),
  to_player_id UUID REFERENCES players(id),
  is_libero BOOLEAN DEFAULT FALSE,
  reason TEXT,           -- táctico, lesión, rotación, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Tabla `timeouts` (nueva)**
```sql
CREATE TABLE timeouts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID REFERENCES sets(id) ON DELETE CASCADE,
  by_team TEXT CHECK (by_team IN ('us','opp')),
  start_ts TIMESTAMPTZ DEFAULT NOW(),
  duration_s INT DEFAULT 60,
  reason TEXT
);
```

---

## 📈 Métricas Desbloqueadas

### **🗺️ Nuevos Heatmaps**
- Aterrizaje de remates rivales en nuestra cancha
- Zonas de saque más efectivas
- Patrones de ataque por rotación

### **📊 KPIs Avanzados**
- Tasa de punto rival según zona de remate y toque de bloqueo
- Eficacia de bloqueo (toque sí/no, solo/doble/triple)
- Side-out condicionado por calidad de recepción 0-3
- ROI de sustituciones por timing

### **🧠 Recomendador Mejorado**
- Evita jugadas donde el rival nos castiga en rotación específica
- Sugiere zonas de saque basado en recepción rival débil
- Timing óptimo para sustituciones según momentum

---

## 🚀 Próximos Pasos

1. **Implementar base de datos** con nuevas columnas
2. **Configurar endpoints REST** para sincronización
3. **Testear offline mode** en condiciones reales
4. **Entrenar usuarios** en nuevos gestos
5. **Recopilar feedback** y ajustar UX

---

## 💡 Tips para Usuarios

### **🎯 Optimización de Velocidad**
- Practica los gestos básicos antes del partido
- Usa modo Pro solo cuando necesites detalles específicos
- Confía en el sistema offline para partidos sin WiFi
- Revisa el historial de deshacer si cometes errores

### **📱 Mejores Prácticas**
- Mantén el dispositivo cargado (usar modo avión + WiFi)
- Posición cómoda: antebrazo apoyado, pulgar libre
- Practica swipes en marcador para puntos rápidos
- Usa vibración como feedback de confirmación

---

**¡El voleibol nunca fue tan rápido de capturar! 🏐⚡**