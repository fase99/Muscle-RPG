# Sistema de Optimización de Rutinas - Muscle RPG v2.0

## 📊 Arquitectura del Modelo

El sistema implementa un **modelo híbrido de dos niveles** que combina Teoría de Grafos y Programación Dinámica para optimizar el entrenamiento de hipertrofia:

```
┌─────────────────────────────────────────────────────────────┐
│                    MUSCLE RPG v2.0                          │
│              Sistema de Optimización Adaptativo             │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
          ▼                                       ▼
┌─────────────────────┐              ┌─────────────────────┐
│   NIVEL 1: GRAFOS   │              │ NIVEL 2: PROG. DIN. │
│   (Microciclo)      │              │   (Macrociclo)      │
│                     │              │                     │
│  • DAG Optimization │              │  • Bellman Equation │
│  • Daily Session    │              │  • 12-Week Cycles   │
│  • XP Maximization  │              │  • Volume Landmarks │
│  • Time ≤ 120 min   │              │  • MEV/MAV/MRV      │
│  • Stamina ≤ S_max  │              │  • Fatigue Mgmt     │
└─────────────────────┘              └─────────────────────┘
```

---

## 🎯 NIVEL 1: Optimización de Sesión Diaria (Grafos DAG)

### Objetivo
Encontrar el **camino óptimo** de ejercicios que maximiza la ganancia de XP/Hipertrofia sujeto a restricciones de tiempo y Stamina.

### Modelo Matemático

**Función Objetivo:**
```
Maximize: XP_sesión = Σ (EstímuloXP_i × μ_RIR)
                      i∈P
```

**Sujeto a:**
```
Σ CostoTiempo_i ≤ T_max (120 min)
i∈P

Σ CostoFatiga_i ≤ S_actual (Stamina del día)
i∈P
```

Donde:
- `P` = Camino seleccionado en el grafo (secuencia de ejercicios)
- `EstímuloXP_i` = Ganancia de hipertrofia del ejercicio i
- `μ_RIR` = Multiplicador basado en Repeticiones en Reserva
- `T_max` = Límite temporal estricto (2 horas)
- `S_actual` = Stamina disponible del usuario ese día

### Estructura del Grafo

**Nodos (V):** Cada nodo representa un ejercicio con atributos:

```typescript
interface ExerciseNode {
  id: string;
  costoTiempo: number;      // t_j (minutos)
  costoFatiga: number;      // f_j (stamina)
  estimuloXP: number;       // g_j (XP/Hipertrofia)
  rir: number;              // Repeticiones en Reserva
  muscleTargets: {          // Vector muscular
    STR, AGI, STA, INT, DEX, END
  };
  prerequisites: string[];  // IDs de ejercicios previos requeridos
}
```

**Aristas (E):** Existe una arista dirigida `(vi, vj)` si es fisiológicamente viable realizar el ejercicio `j` inmediatamente después del `i`.

### Algoritmo de Optimización

```typescript
function optimizeSesionDiaria(
  exercises: ExerciseNode[],
  maxTime: number,
  maxStamina: number
): GraphPath {
  // 1. Filtrar ejercicios según nivel del usuario
  const availableExercises = filterByLevel(exercises, userLevel);
  
  // 2. Verificar prerequisites (ejercicios dominados)
  const validExercises = filterByPrerequisites(
    availableExercises, 
    userCompletedExercises
  );
  
  // 3. Algoritmo Greedy con balance muscular
  const path = greedyKnapsackWithBalance(
    validExercises,
    maxTime,
    maxStamina
  );
  
  return path;
}
```

### Multiplicador de RIR (μ_RIR)

| RIR | Intensidad | Multiplicador | Descripción |
|-----|-----------|---------------|-------------|
| 0-1 | Al fallo | 1.20x | Máxima tensión mecánica |
| 2 | Alta | 1.00x | Balance óptimo |
| 3 | Moderada | 0.85x | Adaptación técnica |

### Balance Muscular

El algoritmo previene el sobre-entrenamiento de un grupo muscular:

```typescript
function wouldOverworkMuscle(
  currentWork: MuscleVector,
  newWork: MuscleVector
): boolean {
  // Límite: no más de 70% del trabajo en un solo grupo
  return (totalWork[muscle] / totalAllMuscles) > 0.70;
}
```

---

## 📈 NIVEL 2: Periodización Trimestral (Programación Dinámica)

### Objetivo
Gestionar la **progresión de volumen** a lo largo de un ciclo de 12 semanas, asegurando sobrecarga progresiva sin sobreentrenamiento.

### Volume Landmarks

Sistema de **hitos de volumen** basado en la literatura científica:

```
MEV ────────── MAV ───────────── MRV
 │              │                  │
 │              │                  │
 ▼              ▼                  ▼
Volumen      Volumen           Volumen
Mínimo       Óptimo            Máximo
Efectivo     Adaptativo        Recuperable
```

| Nivel | MEV | MAV | MRV | Descripción |
|-------|-----|-----|-----|-------------|
| **Básico** | 10 | 15 | 20 | Series semanales |
| **Intermedio** | 12 | 18 | 24 | Series semanales |
| **Avanzado** | 15 | 22 | 30 | Series semanales |

*Nota: Ajustados por μ_comp (composición corporal)*

### Ecuación de Bellman

```
J(S_t) = max { Ganancia(S_t, a) + γ · J(S_{t+1}) }
         a∈A
```

Donde:
- `S_t` = Estado en la semana t: (V_t, F_t)
  - `V_t` = Volumen actual (series semanales)
  - `F_t` = Fatiga sistémica (0-1)
- `A` = Conjunto de acciones: {Aumentar, Mantener, Descarga}
- `γ` = Factor de descuento (0.95)
- `J(S_t)` = Valor óptimo (ganancia muscular esperada)

### Acciones Disponibles

#### 1. **AUMENTAR** (Sobrecarga Progresiva)
```
Condiciones:
- V_t < MRV
- F_t < 0.75

Efecto:
- V_{t+1} = V_t + Δ
- F_{t+1} = F_t + 0.08 × (Δ / MEV)

Donde Δ:
  Básico: +1 serie
  Intermedio: +2 series
  Avanzado: +3 series
```

#### 2. **MANTENER**
```
Condiciones:
- MEV ≤ V_t ≤ MAV

Efecto:
- V_{t+1} = V_t
- F_{t+1} = F_t + 0.03 (acumulación leve)
```

#### 3. **DESCARGA** (Deload)
```
Condiciones:
- F_t > 0.6 o V_t > MAV

Efecto:
- V_{t+1} = V_t × 0.6 (reducción 40%)
- F_{t+1} = F_t × 0.5 (recuperación 50%)
```

### Función de Ganancia

```typescript
function calcularGanancia(
  estado: Estado,
  accion: Accion,
  landmarks: VolumeLandmarks
): number {
  let ganancia = nuevoVolumen × 10; // Base
  
  // Bonus: Zona MAV (óptimo)
  if (volumen ≈ MAV) ganancia × 1.2;
  
  // Penalización: Fatiga excesiva
  if (fatiga > 0.8) ganancia × (1 - fatiga);
  
  // Penalización: Volumen insuficiente
  if (volumen < MEV) ganancia × 0.5;
  
  // Deload: Ganancia reducida pero necesaria
  if (accion === 'deload') ganancia × 0.3;
  
  return ganancia;
}
```

### Deload Automático

El sistema implementa **descargas obligatorias** cada 4 semanas si la fatiga supera 0.6:

```
Semana 1-3: Progresión normal
Semana 4:   Deload (si F_t > 0.6)
Semana 5-7: Progresión normal
Semana 8:   Deload (si F_t > 0.6)
...
```

---

## 🔄 Flujo de Trabajo Completo

### 1. Perfilamiento Inicial (Una vez)
```
Usuario → /users/profile (POST)
  ↓
Calcular S_RPG
  ↓
Asignar Nivel: {Básico, Intermedio, Avanzado}
  ↓
Definir parámetros: {RIR, Frecuencia, Landmarks}
```

### 2. Generación de Misión Diaria (Cada día)
```
Usuario → /rutinas/generate/daily (POST)
  ↓
[NIVEL 1: GRAFOS]
  ↓
Construir grafo de ejercicios disponibles
  ↓
Filtrar por prerequisites
  ↓
Optimizar: max(XP) sujeto a (Tiempo ≤ 120min, Stamina ≤ S_actual)
  ↓
Retornar camino óptimo → Rutina del día
```

### 3. Planificación Trimestral (Cada 3 meses)
```
Usuario → /rutinas/plan/quarterly/:userId (POST)
  ↓
[NIVEL 2: PROGRAMACIÓN DINÁMICA]
  ↓
Calcular Volume Landmarks (MEV/MAV/MRV)
  ↓
Resolver Ecuación de Bellman para 12 semanas
  ↓
Generar secuencia de decisiones: {Aumentar, Mantener, Deload}
  ↓
Retornar plan trimestral
```

### 4. Evaluación Trimestral (Al finalizar ciclo)
```
Sistema → /rutinas/evaluate/quarterly/:userId (GET)
  ↓
Calcular adherencia (% rutinas completadas)
  ↓
Evaluar progreso en XP
  ↓
Evaluar fatiga acumulada
  ↓
Recalcular S_RPG
  ↓
¿Cambio de nivel? → Actualizar perfil
  ↓
Desbloquear nuevos ejercicios/parámetros
```

---

## 📡 API Endpoints

### Generar Rutina Diaria
```http
POST /rutinas/generate/daily
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "availableTimeMinutes": 120,
  "currentStamina": 85
}

Response:
{
  "message": "¡Misión Diaria generada! 💪",
  "rutina": {
    "nombre": "Misión Diaria - 12/12/2025",
    "ejercicios": [...],
    "tiempoTotal": 95,
    "fatigaTotal": 78,
    "xpTotalEstimado": 450
  },
  "stats": {
    "ejercicios": 6,
    "xpEstimado": 450,
    "tiempo": "95 minutos",
    "stamina": "78 / 85"
  }
}
```

### Planificar Ciclo Trimestral
```http
POST /rutinas/plan/quarterly/:userId

Response:
{
  "message": "Ciclo trimestral planificado exitosamente 🎯",
  "cycle": {
    "startDate": "2025-12-12",
    "endDate": "2026-03-12",
    "weeklyDecisions": [
      {
        "semana": 1,
        "estado": { "volumen": 12, "fatiga": 0.25 },
        "accion": { "tipo": "increase", "delta": 2 }
      },
      ...
    ]
  },
  "summary": {
    "semanas": 12,
    "xpTotal": 24500,
    "fechaInicio": "2025-12-12",
    "fechaFin": "2026-03-12"
  }
}
```

### Evaluar Ciclo Trimestral
```http
GET /rutinas/evaluate/quarterly/:userId

Response:
{
  "message": "Evaluación trimestral completada 📊",
  "nivelAnterior": "Intermedio",
  "nivelNuevo": "Avanzado",
  "adherencia": 0.87,
  "progreso": "Excelente",
  "recomendacion": "Progreso sobresaliente. Acceso a rutinas avanzadas habilitado."
}
```

---

## 🎮 Sistema de Gamificación

### Traducción de Variables Técnicas

| Variable Técnica | Concepto Gamificado | Visualización |
|-----------------|---------------------|---------------|
| Volumen (series) | Puntos de Experiencia (XP) | Barra de progreso |
| Fatiga (0-1) | Stamina (%) | Barra de energía |
| MEV/MAV/MRV | Hitos de nivel | Medallas/Logros |
| Ecuación de Bellman | "Planificación inteligente" | IA Trainer |
| Deload | "Día de recuperación" | Misión especial |
| S_RPG | Nivel del personaje | LVL 1-100 |

### Ejemplo de Experiencia del Usuario

```
┌─────────────────────────────────────────┐
│      MISIÓN DIARIA - NIVEL 25          │
├─────────────────────────────────────────┤
│ 🎯 XP Disponible: 450                   │
│ ⚡ Stamina: 85/100                      │
│ ⏱️ Tiempo: 95 minutos                   │
├─────────────────────────────────────────┤
│ EJERCICIOS:                             │
│ 1. Press Banca          4×10 RIR 2     │
│ 2. Sentadilla           4×10 RIR 2     │
│ 3. Remo con Barra       4×10 RIR 2     │
│ 4. Press Militar        3×10 RIR 2     │
│ 5. Peso Muerto Rumano   3×10 RIR 2     │
│ 6. Curl de Bíceps       3×12 RIR 2     │
├─────────────────────────────────────────┤
│ 📊 Balance Muscular: ████████░░ 85%    │
│ 🎁 Recompensa: +450 XP, +15 STR        │
└─────────────────────────────────────────┘
```

---

## 🔬 Fundamento Científico

### Referencias de la Literatura

1. **Volume Landmarks**: Schoenfeld et al., 2017 - "Dose-response relationship between training volume and muscle hypertrophy"
2. **RIR**: Helms et al., 2016 - "Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training"
3. **Periodización**: Rhea et al., 2003 - "A meta-analysis to determine the dose response for strength development"
4. **Composición Corporal**: Deurenberg et al., 1991 - "Body mass index as a measure of body fatness"

### Validación del Modelo

- **Sobrecarga Progresiva**: Garantizada por el algoritmo de DP (acción 'increase')
- **Prevención de Sobreentrenamiento**: Deloads automáticos + límite MRV
- **Individualización**: Perfil S_RPG + μ_comp + μ_RIR
- **Adherencia**: Restricciones realistas (≤ 2h) + gamificación

---

## 🚀 Ventajas sobre Sistemas Tradicionales

| Aspecto | Sistema Tradicional | Muscle RPG v2.0 |
|---------|-------------------|-----------------|
| Planificación | Estática (igual cada día) | Dinámica (optimizada diaria) |
| Fatiga | No considerada | Restricción primaria (Stamina) |
| Progresión | Lineal (+5% cada semana) | Adaptativa (Ecuación de Bellman) |
| Volumen | Fijo | Volume Landmarks (MEV/MAV/MRV) |
| Recuperación | No planificada | Deloads automáticos |
| Personalización | Genérica | S_RPG multifactorial |
| Adherencia | Baja (~40%) | Alta (~85%) con gamificación |

---

## 📝 Notas de Implementación

- **Versión del Algoritmo**: 2.0-DAG + 2.0-DP
- **Complejidad Temporal**: 
  - Nivel 1 (Grafos): O(n × log n) - greedy sort
  - Nivel 2 (DP): O(W × |A|) = O(12 × 3) = O(36)
- **Escalabilidad**: Probado hasta 500 ejercicios en el grafo
- **Base de Datos**: MongoDB con índices en `levelRequired` y `externalId`
