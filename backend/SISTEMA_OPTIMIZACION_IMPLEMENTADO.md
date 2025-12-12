# Sistema de Optimización Matemática - Muscle RPG

## 📋 Resumen Ejecutivo

Se ha implementado exitosamente el núcleo de optimización matemática de "Muscle RPG" con dos niveles jerárquicos:

1. **GraphOptimizerService**: Optimización diaria (Microciclo) usando Algoritmo Greedy
2. **DynamicProgrammingService**: Optimización semanal (Macrociclo) usando Ecuación de Bellman con Memoización

---

## 🎯 Nivel 1: Optimización Diaria (Microciclo)

### GraphOptimizerService

**Archivo**: `backend/src/rutinas/graph-optimizer.service.ts`

### Algoritmo Implementado

**Greedy sobre Grafo Dirigido** con función de selección basada en:

```
Ratio de Eficiencia = XP / (Tiempo + Fatiga/10)
```

### Restricciones Implementadas

#### 1. Restricciones Duras

- **Tiempo Total**: Σ costoTiempo ≤ timeLimit (120 min por defecto)
- **Stamina Total**: Σ costoFatiga ≤ userStamina

#### 2. Restricción de Balance

- **Máximo 40% por Grupo Muscular**: No se permite que más del 40% de los ejercicios seleccionados pertenezcan al mismo grupo muscular
- Implementación en función `getPrimaryMuscleGroup()` y validación en el loop principal

### Flujo del Algoritmo

```typescript
1. Filtrar ejercicios disponibles según userLevel
2. Filtrar ejercicios factibles (costos individuales ≤ límites)
3. Ordenar por ratio XP/(Tiempo + Fatiga/10) [descendente]
4. Selección Greedy:
   PARA cada ejercicio en orden:
     SI cumple restricciones de tiempo Y stamina Y balance muscular:
       - Agregar a la solución
       - Actualizar contadores
     FIN SI
   FIN PARA
5. Retornar camino óptimo
```

### Métricas de Salida

```typescript
interface GraphPath {
  nodes: ExerciseNode[];      // Ejercicios seleccionados
  totalXP: number;            // XP total acumulado
  totalTime: number;          // Tiempo total en minutos
  totalFatigue: number;       // Fatiga total consumida
  muscleBalance: number;      // Balance muscular (0-1)
}
```

### Ejemplo de Uso

```typescript
const optimalPath = await graphOptimizer.optimizeSesionDiaria(
  userId,
  120,        // timeLimit: 120 minutos
  80,         // userStamina: 80
  2,          // targetRIR: 2 (Intermedio)
  ['chest', 'triceps']  // targetMuscleGroups
);
```

---

## 🎯 Nivel 2: Optimización Semanal (Macrociclo)

### DynamicProgrammingService

**Archivo**: `backend/src/rutinas/dynamic-programming.service.ts`

### Algoritmo Implementado

**Programación Dinámica con Memoización (Top-Down)** usando la Ecuación de Bellman:

```
J(S_t) = max_{a ∈ A} { Ganancia(S_t, a) + γ · J(S_{t+1}) }
```

Donde:
- `S_t` = Estado en semana t (Volumen, Fatiga)
- `A` = Conjunto de acciones {SOBRECARGA, MANTENER, DESCARGA}
- `γ` = Factor de descuento (0.95)

### Función Objetivo

```
Ganancia = XP_esperada - (Fatiga²)
```

**Componentes**:
- `XP_esperada`: Proporcional al volumen semanal con bonificaciones por zona óptima (MAV)
- `Fatiga²`: Penalización cuadrática que crece rápidamente con la fatiga

### Estados y Acciones

#### Estado (S_t)

```typescript
interface Estado {
  volumen: number;   // Series semanales actuales
  fatiga: number;    // Fatiga sistémica [0-1]
}
```

#### Acciones Disponibles

1. **SOBRECARGA** (`increase`):
   - Delta: +10% del volumen actual
   - Condición: volumen < límite Y fatiga < 0.75
   - Límite para Básicos: MAV
   - Límite para Intermedios/Avanzados: MRV

2. **MANTENER** (`maintain`):
   - Delta: 0
   - Condición: MEV ≤ volumen ≤ límite

3. **DESCARGA** (`deload`):
   - Delta: Reducir a MEV
   - Condición: fatiga > 0.6 O volumen > MAV

### Volume Landmarks

```typescript
interface VolumeLandmarks {
  MEV: number;  // Minimum Effective Volume
  MAV: number;  // Maximum Adaptive Volume
  MRV: number;  // Maximum Recoverable Volume
}
```

**Valores por Nivel** (ajustados por composición corporal):

| Nivel       | MEV | MAV | MRV |
|-------------|-----|-----|-----|
| Básico      | 10  | 15  | 20  |
| Intermedio  | 12  | 18  | 24  |
| Avanzado    | 15  | 22  | 30  |

### Memoización

**Implementación Top-Down** con cache de estados:

```typescript
private memoCache: Map<string, number>;

private generateStateKey(estado: Estado, weeksRemaining: number): string {
  const volDiscrete = Math.round(estado.volumen);
  const fatigaDiscrete = Math.round(estado.fatiga * 10) / 10;
  return `v${volDiscrete}_f${fatigaDiscrete}_w${weeksRemaining}`;
}
```

**Beneficios**:
- Evita recalcular estados ya visitados
- Reduce complejidad de O(3^n) a O(n·V·F) donde V=volúmenes posibles, F=niveles de fatiga
- Eficiencia en ciclos trimestrales (12 semanas)

### Flujo del Algoritmo

```typescript
1. Inicializar cache de memoización
2. Estado inicial: (volumen=MEV, fatiga=0.2)
3. PARA cada semana (1 a 12):
     acciones = getPossibleActions(estado_actual)
     mejor_valor = -∞
     
     PARA cada acción:
       nuevo_estado = aplicarAccion(estado, accion)
       ganancia = calcularGanancia(estado, accion)
       valor_futuro = bellmanValue(nuevo_estado) [MEMOIZADO]
       valor_total = ganancia + γ·valor_futuro
       
       SI valor_total > mejor_valor:
         mejor_accion = accion
         mejor_valor = valor_total
       FIN SI
     FIN PARA
     
     estado_actual = aplicarAccion(estado_actual, mejor_accion)
     guardar_decision(semana, estado_actual, mejor_accion)
   FIN PARA
4. Retornar secuencia de decisiones
```

### Ejemplo de Uso

```typescript
const cycle = await dynamicProgramming.planQuarterlyCycle(userId);

// Resultado:
{
  weeklyDecisions: [
    { semana: 1, estado: {volumen: 10, fatiga: 0.2}, accion: 'increase', valor: 150 },
    { semana: 2, estado: {volumen: 11, fatiga: 0.28}, accion: 'increase', valor: 165 },
    // ... 12 semanas
  ],
  totalXPGained: 1850,
  volumeProgression: [10, 11, 12, 13, 14, 15, 10, 11, 12, 13, 14, 15]
}
```

---

## 🔗 Integración

### Flujo Completo en RutinasService

```typescript
// 1. Generar rutina diaria (Microciclo)
const dailyRoutine = await rutinasService.generateDailyRoutine(userId);
// Usa GraphOptimizerService internamente

// 2. Planificar ciclo trimestral (Macrociclo)
const quarterlyCycle = await dynamicProgramming.planQuarterlyCycle(userId);
// Usa DynamicProgrammingService con Bellman + Memoización
```

### Jerarquía de Optimización

```
┌─────────────────────────────────────┐
│  DynamicProgrammingService (L2)     │
│  ↓ Decisión semanal: volumen objetivo│
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  GraphOptimizerService (L1)         │
│  ↓ Selección diaria: ejercicios     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Usuario ejecuta rutina              │
└─────────────────────────────────────┘
```

---

## ✅ Verificación de Requerimientos

### GraphOptimizerService ✓

- [x] Input: userStamina, timeLimit (fijo 120 min), userLevel
- [x] Entidad Ejercicio: xpValue, fatigueCost, timeCost, muscleGroup
- [x] Selección iterativa basada en XP / (Time + Fatigue)
- [x] Restricción Dura 1: Σ timeCost ≤ timeLimit
- [x] Restricción Dura 2: Σ fatigueCost ≤ userStamina
- [x] Restricción de Balance: Máximo 40% por muscleGroup

### DynamicProgrammingService ✓

- [x] Estado: Volume (V_t) y Fatigue (F_t)
- [x] Acciones: SOBRECARGA (+10%), MANTENER, DESCARGA (a MEV)
- [x] Landmarks: Básicos ≤ MAV, Avanzados → MRV
- [x] Función Objetivo: XP_esperada - (Fatiga²)
- [x] Memoización Top-Down para eficiencia
- [x] Ecuación de Bellman implementada correctamente

---

## 🚀 Mejoras Futuras

1. **Optimización Multi-Objetivo**: Considerar otros factores como adherencia, tiempo de recuperación
2. **Aprendizaje Adaptativo**: Ajustar parámetros basándose en el rendimiento real del usuario
3. **Constraints Dinámicos**: Adaptar restricciones según lesiones o limitaciones temporales
4. **Exploración vs Explotación**: Añadir variabilidad controlada para evitar estancamiento

---

## 📚 Referencias Técnicas

- **Algoritmo Greedy**: Selección voraz basada en función heurística
- **Programación Dinámica**: Ecuación de Bellman con memoización top-down
- **Optimización con Restricciones**: Knapsack multi-dimensional
- **Periodización Deportiva**: MEV, MAV, MRV (Mike Israetel)

---

**Fecha de Implementación**: Diciembre 2025  
**Versión del Sistema**: 2.0
