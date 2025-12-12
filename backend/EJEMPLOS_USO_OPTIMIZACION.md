# Ejemplos de Uso - Sistema de Optimización

## 🎮 Caso de Uso 1: Rutina Diaria para Usuario Intermedio

### Escenario
- Usuario: Juan (Nivel 42, Intermedio)
- Stamina disponible: 85
- Tiempo disponible: 120 minutos
- Grupos musculares objetivo: Pecho y Tríceps

### Código

```typescript
// En tu controlador o servicio
async generarMisionDiaria(userId: string) {
  // El servicio de rutinas ya integra el GraphOptimizer
  const rutina = await this.rutinasService.generateDailyRoutine(
    userId,
    120,  // timeLimit
    85    // availableStamina (opcional, usa staminaActual del usuario si no se pasa)
  );
  
  return rutina;
}
```

### Resultado Esperado

```json
{
  "nombre": "Misión Diaria - Intermedio",
  "descripcion": "Hipertrofia - Perfil Intermedio (RIR 2). Algoritmo DAG. XP: 425",
  "ejercicios": [
    {
      "nombre": "Bench Press",
      "series": 4,
      "repeticiones": 10,
      "rir": 2,
      "costoTiempo": 10,
      "costoFatiga": 32,
      "estimuloXP": 60,
      "completado": false
    },
    {
      "nombre": "Incline Dumbbell Press",
      "series": 4,
      "repeticiones": 10,
      "rir": 2,
      "costoTiempo": 10,
      "costoFatiga": 32,
      "estimuloXP": 60,
      "completado": false
    },
    {
      "nombre": "Triceps Pushdown",
      "series": 4,
      "repeticiones": 10,
      "rir": 2,
      "costoTiempo": 10,
      "costoFatiga": 32,
      "estimuloXP": 60,
      "completado": false
    }
    // ... más ejercicios hasta alcanzar límites
  ],
  "tiempoTotal": 118,
  "fatigaTotal": 84,
  "xpTotalEstimado": 425,
  "currentVolume": 16,  // 4 ejercicios × 4 series
  "muscleBalance": 0.85
}
```

### Logs del Sistema

```
[GraphOptimizer] Iniciando optimización de sesión diaria (Graph Greedy Algorithm)...
[GraphOptimizer] Restricciones: Tiempo=120min, Stamina=85
[GraphOptimizer] Ejercicios candidatos: 45
[GraphOptimizer] Ejercicios factibles: 45
[GraphOptimizer] Top 3 ejercicios por ratio XP/(Time+Fatigue):
  1. Bench Press: 4.29
  2. Incline Dumbbell Press: 4.29
  3. Triceps Pushdown: 4.29
[GraphOptimizer] ✓ Bench Press | Grupo: chest | Ratio: 4.29 | XP: 60.0
[GraphOptimizer] ✓ Incline Dumbbell Press | Grupo: chest | Ratio: 4.29 | XP: 60.0
[GraphOptimizer] ✓ Triceps Pushdown | Grupo: triceps | Ratio: 4.29 | XP: 60.0
[GraphOptimizer] ✓ Dips | Grupo: chest | Ratio: 4.10 | XP: 57.0
[GraphOptimizer] Ejercicio Cable Crossover (chest) rechazado: excede 40% de balance
[GraphOptimizer] ✓ Close Grip Bench Press | Grupo: triceps | Ratio: 4.10 | XP: 57.0
[GraphOptimizer] ✅ Camino óptimo: 5 ejercicios
[GraphOptimizer] XP Total: 425.0, Tiempo: 118min, Fatiga: 84.0
[GraphOptimizer] Balance Muscular: 0.85
[GraphOptimizer] Distribución por grupo:
  - chest: 3 ejercicios (60.0%)
  - triceps: 2 ejercicios (40.0%)
```

---

## 🎮 Caso de Uso 2: Planificación Trimestral para Usuario Básico

### Escenario
- Usuario: María (Nivel 15, Básica)
- Planificar próximas 12 semanas
- Objetivo: Hipertrofia gradual

### Código

```typescript
async planificarCicloTrimestral(userId: string) {
  const cycle = await this.dynamicProgrammingService.planQuarterlyCycle(userId);
  
  return cycle;
}
```

### Resultado Esperado

```json
{
  "startDate": "2025-12-12T00:00:00.000Z",
  "endDate": "2026-03-12T00:00:00.000Z",
  "weeklyDecisions": [
    {
      "semana": 1,
      "estado": { "volumen": 10, "fatiga": 0.2 },
      "accion": { "tipo": "increase", "delta": 1 },
      "valor": 150.5,
      "ganancia": 95.0
    },
    {
      "semana": 2,
      "estado": { "volumen": 11, "fatiga": 0.28 },
      "accion": { "tipo": "increase", "delta": 1 },
      "valor": 165.2,
      "ganancia": 102.1
    },
    {
      "semana": 3,
      "estado": { "volumen": 12, "fatiga": 0.36 },
      "accion": { "tipo": "increase", "delta": 1 },
      "valor": 178.8,
      "ganancia": 107.6
    },
    {
      "semana": 4,
      "estado": { "volumen": 13, "fatiga": 0.44 },
      "accion": { "tipo": "maintain", "delta": 0 },
      "valor": 185.3,
      "ganancia": 110.4
    },
    {
      "semana": 5,
      "estado": { "volumen": 13, "fatiga": 0.47 },
      "accion": { "tipo": "increase", "delta": 1 },
      "valor": 192.0,
      "ganancia": 112.0
    },
    {
      "semana": 6,
      "estado": { "volumen": 14, "fatiga": 0.55 },
      "accion": { "tipo": "increase", "delta": 1 },
      "valor": 200.5,
      "ganancia": 115.0
    },
    {
      "semana": 7,
      "estado": { "volumen": 15, "fatiga": 0.63 },
      "accion": { "tipo": "deload", "delta": -5 },
      "valor": 125.0,
      "ganancia": 55.0
    },
    {
      "semana": 8,
      "estado": { "volumen": 10, "fatiga": 0.32 },
      "accion": { "tipo": "increase", "delta": 1 },
      "valor": 158.0,
      "ganancia": 98.0
    }
    // ... semanas 9-12
  ],
  "totalXPGained": 1650,
  "averageAdherence": 0.85,
  "finalFatigue": 0.35,
  "volumeProgression": [10, 11, 12, 13, 13, 14, 15, 10, 11, 12, 13, 14]
}
```

### Logs del Sistema

```
[DynamicProgramming] Planificando ciclo trimestral...
[DynamicProgramming] Landmarks - MEV: 10, MAV: 15, MRV: 20
[DynamicProgramming] Semana 1: Vol=10, Fatiga=0.20
  Acción increase: Ganancia=95.0, ValorFuturo=55.5, Total=150.5
  Acción maintain: Ganancia=90.0, ValorFuturo=52.0, Total=142.0
  ✓ Mejor acción: increase (delta=1)
[DynamicProgramming] Semana 2: Vol=11, Fatiga=0.28
  Acción increase: Ganancia=102.1, ValorFuturo=63.1, Total=165.2
  Acción maintain: Ganancia=98.0, ValorFuturo=60.0, Total=158.0
  ✓ Mejor acción: increase (delta=1)
[DynamicProgramming] Semana 3: Vol=12, Fatiga=0.36
  Acción increase: Ganancia=107.6, ValorFuturo=71.2, Total=178.8
  Acción maintain: Ganancia=105.0, ValorFuturo=68.0, Total=173.0
  ✓ Mejor acción: increase (delta=1)
[DynamicProgramming] Semana 4: Vol=13, Fatiga=0.44
  Acción increase: Ganancia=110.4, ValorFuturo=72.5, Total=182.9
  Acción maintain: Ganancia=112.0, ValorFuturo=73.3, Total=185.3
  ✓ Mejor acción: maintain (delta=0)
...
[DynamicProgramming] Semana 7: Vol=15, Fatiga=0.63
  Acción deload: Ganancia=55.0, ValorFuturo=70.0, Total=125.0
  Acción maintain: Ganancia=85.0, ValorFuturo=30.0, Total=115.0
  ✓ Mejor acción: deload (delta=-5)
[DynamicProgramming] Ciclo planificado: 12 semanas
[DynamicProgramming] XP Total Proyectado: 1650
```

---

## 🎮 Caso de Uso 3: Rutina Semanal Completa (Push/Pull/Legs)

### Escenario
- Usuario: Carlos (Nivel 55, Intermedio)
- Frecuencia: 4 sesiones semanales
- Split: Push / Pull / Legs / Upper

### Código

```typescript
async generarRutinaSemanal(userId: string, frecuencia: number) {
  const rutinaSemanal = await this.rutinasService.generateWeeklyRoutine(
    userId,
    frecuencia
  );
  
  return rutinaSemanal;
}
```

### Resultado Esperado

```json
{
  "nombre": "Rutina Semanal - Intermedio",
  "descripcion": "4 sesiones semanales con split Push/Pull/Legs/Upper",
  "sessions": [
    {
      "dia": "Lunes",
      "nombre": "Push (Pecho + Hombros + Tríceps)",
      "ejercicios": [
        { "nombre": "Bench Press", "series": 4, "rir": 2 },
        { "nombre": "Overhead Press", "series": 4, "rir": 2 },
        { "nombre": "Incline DB Press", "series": 4, "rir": 2 },
        { "nombre": "Triceps Extension", "series": 3, "rir": 2 }
      ],
      "xpTotal": 350,
      "muscleBalance": 0.88
    },
    {
      "dia": "Miércoles",
      "nombre": "Pull (Espalda + Bíceps)",
      "ejercicios": [
        { "nombre": "Pull-ups", "series": 4, "rir": 2 },
        { "nombre": "Barbell Row", "series": 4, "rir": 2 },
        { "nombre": "Lat Pulldown", "series": 4, "rir": 2 },
        { "nombre": "Bicep Curl", "series": 3, "rir": 2 }
      ],
      "xpTotal": 360,
      "muscleBalance": 0.90
    },
    {
      "dia": "Viernes",
      "nombre": "Legs (Piernas completas)",
      "ejercicios": [
        { "nombre": "Squat", "series": 4, "rir": 2 },
        { "nombre": "Romanian Deadlift", "series": 4, "rir": 2 },
        { "nombre": "Leg Press", "series": 4, "rir": 2 },
        { "nombre": "Calf Raise", "series": 3, "rir": 2 }
      ],
      "xpTotal": 380,
      "muscleBalance": 0.85
    },
    {
      "dia": "Domingo",
      "nombre": "Upper (Torso completo)",
      "ejercicios": [
        { "nombre": "Incline Bench Press", "series": 3, "rir": 2 },
        { "nombre": "Cable Row", "series": 3, "rir": 2 },
        { "nombre": "Lateral Raise", "series": 3, "rir": 2 },
        { "nombre": "Face Pull", "series": 3, "rir": 2 }
      ],
      "xpTotal": 280,
      "muscleBalance": 0.92
    }
  ],
  "volumenSemanalTotal": 62,  // series totales
  "xpSemanalTotal": 1370,
  "adherenciaEsperada": 0.85
}
```

---

## 🎮 Caso de Uso 4: Adaptación Dinámica según Fatiga

### Escenario
- Usuario llega con baja stamina (50/100)
- Sistema debe ajustar la rutina automáticamente

### Código

```typescript
async generarRutinaAdaptativa(userId: string) {
  const user = await this.userModel.findById(userId);
  
  // El sistema detecta automáticamente la stamina disponible
  const rutina = await this.rutinasService.generateDailyRoutine(
    userId,
    120,
    user.staminaActual  // 50 en este caso
  );
  
  return rutina;
}
```

### Resultado Esperado

```json
{
  "nombre": "Misión Diaria Adaptada - Intermedio",
  "descripcion": "Rutina ajustada por baja stamina (50/100)",
  "ejercicios": [
    {
      "nombre": "Bench Press",
      "series": 4,
      "repeticiones": 10,
      "rir": 2,
      "costoFatiga": 32,
      "estimuloXP": 60
    }
    // Solo 1-2 ejercicios debido a baja stamina
  ],
  "tiempoTotal": 25,
  "fatigaTotal": 48,  // No excede 50
  "xpTotalEstimado": 120,
  "advertencia": "Rutina reducida debido a baja stamina. Considera descansar."
}
```

### Logs del Sistema

```
[GraphOptimizer] Usuario con stamina reducida: 50/100
[GraphOptimizer] Ajustando número de ejercicios...
[GraphOptimizer] ✅ Camino óptimo: 2 ejercicios (reducido por stamina)
[GraphOptimizer] XP Total: 120.0, Tiempo: 25min, Fatiga: 48.0
```

---

## 📊 Análisis de Resultados

### Métricas del Algoritmo Greedy

```typescript
// Ejemplo de métricas internas
{
  "graphNodesEvaluated": 45,      // Ejercicios considerados
  "pathsConsidered": 1,            // Caminos explorados
  "optimizationTime": 12,          // Milisegundos
  "muscleGroupDistribution": {
    "chest": 0.40,                 // 40%
    "triceps": 0.30,               // 30%
    "shoulders": 0.30              // 30%
  },
  "constraintsSatisfied": true,
  "balanceScore": 0.85
}
```

### Progresión del Ciclo Trimestral

```
Semana | Volumen | Fatiga | Acción     | XP Ganada
-------|---------|--------|------------|----------
1      | 10      | 0.20   | SOBRECARGA | 95
2      | 11      | 0.28   | SOBRECARGA | 102
3      | 12      | 0.36   | SOBRECARGA | 108
4      | 13      | 0.44   | MANTENER   | 110
5      | 13      | 0.47   | SOBRECARGA | 112
6      | 14      | 0.55   | SOBRECARGA | 115
7      | 15      | 0.63   | DESCARGA   | 55  ← Deload
8      | 10      | 0.32   | SOBRECARGA | 98
...
```

---

## 🔧 Testing

### Test Unitario para GraphOptimizer

```typescript
describe('GraphOptimizerService', () => {
  it('debe respetar la restricción del 40% por grupo muscular', async () => {
    const result = await graphOptimizer.optimizeSesionDiaria(
      userId,
      120,
      100,
      2,
      ['chest']  // Solo pecho
    );
    
    // Contar ejercicios de pecho
    const chestCount = result.nodes.filter(n => 
      n.targetMuscles?.includes('chest')
    ).length;
    
    const totalCount = result.nodes.length;
    const percentage = chestCount / totalCount;
    
    // Debe ser <= 40%
    expect(percentage).toBeLessThanOrEqual(0.40);
  });
});
```

### Test de Integración para DynamicProgramming

```typescript
describe('DynamicProgrammingService', () => {
  it('debe generar ciclo de 12 semanas con memoización', async () => {
    const cycle = await dynamicProgramming.planQuarterlyCycle(userId);
    
    expect(cycle.weeklyDecisions).toHaveLength(12);
    expect(cycle.totalXPGained).toBeGreaterThan(0);
    
    // Verificar que usó memoización (cache debe tener entradas)
    const cacheSize = dynamicProgramming['memoCache'].size;
    expect(cacheSize).toBeGreaterThan(0);
  });
});
```

---

**Última actualización**: Diciembre 2025
