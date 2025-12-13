# 📈 Optimización de Macrociclo: Programación Dinámica

## 🎯 Visión General

El sistema de optimización de macrociclo utiliza **Programación Dinámica** para gestionar la progresión del volumen de entrenamiento a lo largo de ciclos trimestrales (12 semanas). Este módulo representa el **Nivel 2** del sistema de optimización de Muscle RPG y complementa la optimización diaria de sesiones (Nivel 1 - Grafos).

### Objetivo Principal

Maximizar la **ganancia muscular (hipertrofia)** a largo plazo mediante la gestión inteligente del volumen de entrenamiento, balanceando:
- **Sobrecarga Progresiva**: Incremento gradual del volumen para forzar adaptaciones
- **Gestión de Fatiga**: Prevención del sobreentrenamiento mediante descargas estratégicas
- **Adherencia**: Mantenimiento de un programa sostenible y personalizado

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│           NIVEL 2: PROGRAMACIÓN DINÁMICA                    │
│              (Planificación Trimestral)                     │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   ENTRADA    │  │  OPTIMIZACIÓN │  │    SALIDA    │
│              │  │               │  │              │
│ • Estado     │  │ • Ecuación de │  │ • Decisión   │
│   Inicial    │  │   Bellman     │  │   Semanal    │
│ • Landmarks  │  │ • Evaluación  │  │ • Volumen    │
│   (MEV/MAV/  │  │   de Acciones │  │   Óptimo     │
│   MRV)       │  │ • Predicción  │  │ • Fatiga     │
│ • Perfil     │  │   del Futuro  │  │   Estimada   │
│   Usuario    │  │               │  │ • XP Total   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 📊 Fundamentos Teóricos

### Volume Landmarks

Sistema de **hitos de volumen** basado en la investigación científica sobre hipertrofia:

```
MEV ────────────── MAV ──────────────── MRV
 │                  │                    │
 │                  │                    │
 ▼                  ▼                    ▼
Mínimo            Óptimo              Máximo
Efectivo          Adaptativo          Recuperable
```

#### Definiciones

| Landmark | Nombre | Descripción | Efecto |
|----------|--------|-------------|--------|
| **MEV** | Minimum Effective Volume | Volumen mínimo que produce ganancias musculares | Umbral de efectividad |
| **MAV** | Maximum Adaptive Volume | Volumen óptimo que maximiza adaptaciones | Zona de oro |
| **MRV** | Maximum Recoverable Volume | Volumen máximo que el cuerpo puede recuperar | Límite de seguridad |

#### Valores por Nivel de Usuario

| Nivel | MEV | MAV | MRV | Descripción |
|-------|-----|-----|-----|-------------|
| **Básico** | 10 | 15 | 20 | Principiantes (< 1 año) |
| **Intermedio** | 12 | 18 | 24 | Entrenan 1-3 años |
| **Avanzado** | 15 | 22 | 30 | Entrenan > 3 años |

*Nota: Valores expresados en series semanales por grupo muscular. Ajustados por μ_comp (composición corporal).*

---

## 🧮 Ecuación de Bellman

La Programación Dinámica se basa en la **Ecuación de Bellman**, que encuentra la decisión óptima en cada paso considerando las consecuencias futuras:

```
J(S_t) = max { Ganancia(S_t, a) + γ · J(S_{t+1}) }
         a∈A
```

### Componentes de la Ecuación

| Símbolo | Nombre | Descripción |
|---------|--------|-------------|
| **S_t** | Estado en tiempo t | Tupla (V_t, F_t) - Volumen y Fatiga actuales |
| **a** | Acción | Decisión a tomar: {Aumentar, Mantener, Descarga} |
| **A** | Espacio de acciones | Conjunto de todas las acciones posibles |
| **J(S_t)** | Función de valor | Ganancia muscular esperada desde el estado S_t |
| **γ** | Factor de descuento | 0.95 - Peso del futuro vs presente |
| **Ganancia(S_t, a)** | Recompensa inmediata | XP/Hipertrofia ganada en la semana actual |
| **J(S_{t+1})** | Valor futuro | Ganancia esperada en semanas futuras |

### Estado del Sistema

El estado en cada semana se define como:

```typescript
interface Estado {
  volumen: number;   // V_t: Series semanales actuales
  fatiga: number;    // F_t: Fatiga sistémica (0-1)
}
```

- **Volumen (V_t)**: Número de series semanales planificadas (ej: 15 series)
- **Fatiga (F_t)**: Nivel de estrés acumulado (0 = descansado, 1 = exhausto)

---

## ⚡ Acciones Disponibles

En cada semana, el sistema evalúa tres acciones posibles:

### 1. 🔼 AUMENTAR (Sobrecarga Progresiva)

```typescript
{
  tipo: 'increase',
  delta: +1 a +3 series  // Según nivel del usuario
}
```

**Condiciones para aplicar:**
- Volumen actual < MRV
- Fatiga < 0.75

**Efectos:**
```
V_{t+1} = V_t + Δ
F_{t+1} = F_t + 0.08 × (Δ / MEV)
```

**Incremento (Δ) según nivel:**
- Básico: +1 serie
- Intermedio: +2 series
- Avanzado: +3 series

### 2. ➡️ MANTENER

```typescript
{
  tipo: 'maintain',
  delta: 0
}
```

**Condiciones para aplicar:**
- MEV ≤ Volumen ≤ MAV

**Efectos:**
```
V_{t+1} = V_t
F_{t+1} = F_t + 0.03  // Acumulación leve
```

### 3. 🔽 DESCARGA (Deload)

```typescript
{
  tipo: 'deload',
  delta: -40% del volumen actual
}
```

**Condiciones para aplicar:**
- Fatiga > 0.6, o
- Volumen > MAV

**Efectos:**
```
V_{t+1} = V_t × 0.6      // Reducción 40%
F_{t+1} = F_t × 0.5      // Recuperación 50%
```

---

## 💰 Función de Ganancia

La ganancia inmediata de cada acción se calcula mediante:

```typescript
function calcularGanancia(
  estado: Estado,
  accion: Accion,
  landmarks: VolumeLandmarks
): number {
  const nuevoEstado = aplicarAccion(estado, accion, landmarks);
  
  // 1. Ganancia base proporcional al volumen
  let ganancia = nuevoEstado.volumen × 10;
  
  // 2. Bonus: Zona MAV (óptima)
  if (volumen ≈ MAV) {
    ganancia × 1.2;  // +20% en zona óptima
  }
  
  // 3. Penalización: Fatiga excesiva
  if (nuevoEstado.fatiga > 0.8) {
    ganancia × (1 - nuevoEstado.fatiga);  // Reducción drástica
  }
  
  // 4. Penalización: Volumen insuficiente
  if (nuevoEstado.volumen < landmarks.MEV) {
    ganancia × 0.5;  // -50%
  }
  
  // 5. Deload: Ganancia reducida pero necesaria
  if (accion.tipo === 'deload') {
    ganancia × 0.3;  // Solo 30%, pero recupera fatiga
  }
  
  return ganancia;
}
```

### Componentes de la Ganancia

| Factor | Efecto | Justificación |
|--------|--------|---------------|
| **Volumen base** | × 10 | Mayor volumen = más estímulo |
| **Zona MAV** | +20% | Volumen óptimo para adaptaciones |
| **Fatiga alta** | -50% a -100% | Sobreentrenamiento reduce ganancias |
| **Volumen bajo** | -50% | Estímulo insuficiente |
| **Deload** | -70% | Necesario para recuperación |

---

## 🔮 Estimación del Valor Futuro

Para predecir las consecuencias futuras de cada decisión:

```typescript
function estimarValorFuturo(
  estado: Estado,
  landmarks: VolumeLandmarks,
  weeksRemaining: number
): number {
  if (weeksRemaining <= 0) return 0;
  
  // 1. Potencial base
  let valorFuturo = estado.volumen × 10 × weeksRemaining;
  
  // 2. Ajuste por fatiga
  valorFuturo × (1 - estado.fatiga × 0.5);
  
  // 3. Ajuste por proximidad al MAV
  const distanciaMAV = |estado.volumen - landmarks.MAV|;
  const factorOptimalidad = 1 - (distanciaMAV / landmarks.MAV);
  valorFuturo × (0.8 + 0.4 × factorOptimalidad);
  
  return valorFuturo;
}
```

### Factores Predictivos

1. **Potencial de volumen**: Capacidad de trabajar en semanas futuras
2. **Fatiga acumulada**: Alta fatiga limita el rendimiento futuro
3. **Cercanía al MAV**: Estados cerca del volumen óptimo tienen mayor potencial

---

## 🔄 Algoritmo de Optimización

### Pseudocódigo

```typescript
function planQuarterlyCycle(userId: string): QuarterlyCycle {
  // 1. Obtener datos del usuario
  const profile = await getProfile(userId);
  const landmarks = calculateVolumeLandmarks(profile);
  
  // 2. Estado inicial
  let estado = {
    volumen: landmarks.MEV,  // Comenzar en mínimo efectivo
    fatiga: 0.2              // Recién descansado
  };
  
  const decisions: DecisionNode[] = [];
  
  // 3. Iterar por 12 semanas
  for (let semana = 1; semana <= 12; semana++) {
    // 3.1 Obtener acciones posibles
    const acciones = getPossibleActions(estado, landmarks);
    
    // 3.2 Evaluar cada acción usando Bellman
    let mejorAccion = null;
    let mejorValor = -Infinity;
    
    for (const accion of acciones) {
      const nuevoEstado = aplicarAccion(estado, accion);
      const ganancia = calcularGanancia(estado, accion, landmarks);
      const valorFuturo = estimarValorFuturo(nuevoEstado, landmarks, 12 - semana);
      
      const valor = ganancia + GAMMA × valorFuturo;
      
      if (valor > mejorValor) {
        mejorValor = valor;
        mejorAccion = accion;
      }
    }
    
    // 3.3 Aplicar la mejor acción
    estado = aplicarAccion(estado, mejorAccion);
    decisions.push({
      semana,
      estado,
      accion: mejorAccion,
      valor: mejorValor,
      ganancia
    });
    
    // 3.4 Deload obligatorio cada 4 semanas si fatiga > 0.6
    if (semana % 4 === 0 && estado.fatiga > 0.6) {
      estado.volumen × 0.5;
      estado.fatiga × 0.4;
    }
  }
  
  return { decisions, totalXP, ... };
}
```

### Flujo de Decisión

```
┌─────────────────────────────────────────────────────────┐
│              Inicio de Semana t                         │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Obtener Estado Actual: S_t = (V_t, F_t)               │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Generar Acciones Posibles: A                           │
│  • Aumentar (si V_t < MRV y F_t < 0.75)                │
│  • Mantener (si MEV ≤ V_t ≤ MAV)                       │
│  • Descarga (si F_t > 0.6 o V_t > MAV)                 │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Para cada acción a ∈ A:                                │
│  1. Simular nuevo estado: S_{t+1}                       │
│  2. Calcular ganancia: G(S_t, a)                        │
│  3. Estimar valor futuro: J(S_{t+1})                    │
│  4. Calcular valor total: V = G + γ·J                   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Seleccionar acción con mayor valor: a* = argmax(V)    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Aplicar acción: S_{t+1} = T(S_t, a*)                  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  ¿Es semana 4, 8 o 12 y F_t > 0.6?                     │
│  Sí → Deload obligatorio                               │
│  No → Continuar                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementación en Código

### Estructura de Clases

```typescript
@Injectable()
export class DynamicProgrammingService {
  private readonly GAMMA = 0.95;  // Factor de descuento
  private readonly WEEKS_PER_QUARTER = 12;
  
  async planQuarterlyCycle(userId: string): Promise<QuarterlyCycle>
  
  private solveWithBellman(
    estadoInicial: Estado,
    landmarks: VolumeLandmarks,
    weeksRemaining: number,
    userLevel: string
  ): DecisionNode[]
  
  private getPossibleActions(
    estado: Estado,
    landmarks: VolumeLandmarks,
    userLevel: string
  ): Accion[]
  
  private aplicarAccion(
    estado: Estado,
    accion: Accion,
    landmarks: VolumeLandmarks
  ): Estado
  
  private calcularGanancia(
    estado: Estado,
    accion: Accion,
    landmarks: VolumeLandmarks
  ): number
  
  private estimarValorFuturo(
    estado: Estado,
    landmarks: VolumeLandmarks,
    weeksRemaining: number
  ): number
  
  private calculateVolumeLandmarks(profile: Profile): VolumeLandmarks
  
  async evaluarCicloCompleto(userId: string): Promise<EvaluacionCiclo>
}
```

### Interfaces Principales

```typescript
interface Estado {
  volumen: number;    // V_t: Series semanales actuales
  fatiga: number;     // F_t: Fatiga sistémica (0-1)
}

interface Accion {
  tipo: 'increase' | 'maintain' | 'deload';
  delta: number;      // Cambio en volumen
}

interface DecisionNode {
  semana: number;
  estado: Estado;
  accion: Accion;
  valor: number;      // J(S_t): Valor esperado
  ganancia: number;   // Ganancia inmediata
}

interface QuarterlyCycle {
  startDate: Date;
  endDate: Date;
  weeklyDecisions: DecisionNode[];
  totalXPGained: number;
  averageAdherence: number;
  finalFatigue: number;
  volumeProgression: number[];
}

interface VolumeLandmarks {
  MEV: number;  // Minimum Effective Volume
  MAV: number;  // Maximum Adaptive Volume
  MRV: number;  // Maximum Recoverable Volume
}
```

---

## 📅 Ejemplo de Ciclo Trimestral

### Usuario: Intermedio

**Landmarks:**
- MEV: 12 series/semana
- MAV: 18 series/semana
- MRV: 24 series/semana

### Progresión de 12 Semanas

| Semana | Volumen | Fatiga | Acción | Ganancia | Justificación |
|--------|---------|--------|--------|----------|---------------|
| 1 | 12 | 0.20 | MANTENER | 120 XP | Estado inicial |
| 2 | 14 | 0.26 | AUMENTAR | 140 XP | Fatiga baja, volumen bajo |
| 3 | 16 | 0.35 | AUMENTAR | 160 XP | Progresión continua |
| **4** | **8** | **0.14** | **DELOAD** | **24 XP** | **Descarga programada** |
| 5 | 14 | 0.20 | AUMENTAR | 140 XP | Recuperado, reanudando |
| 6 | 16 | 0.28 | AUMENTAR | 160 XP | Aproximándose a MAV |
| 7 | 18 | 0.39 | AUMENTAR | 216 XP | ¡Zona MAV! (+20% bonus) |
| **8** | **11** | **0.19** | **DELOAD** | **33 XP** | **Descarga programada** |
| 9 | 16 | 0.27 | AUMENTAR | 160 XP | Vuelta a progresión |
| 10 | 18 | 0.38 | AUMENTAR | 216 XP | Zona MAV nuevamente |
| 11 | 20 | 0.51 | AUMENTAR | 200 XP | Cerca del límite |
| **12** | **12** | **0.25** | **DELOAD** | **36 XP** | **Descarga final** |

**Totales:**
- XP Total: 1,605 XP
- Adherencia: 85%
- Fatiga Final: 0.25 (baja)

---

## 🎓 Ventajas de la Programación Dinámica

### 1. **Optimización Global**
- Considera las consecuencias futuras de cada decisión
- No se queda atrapado en máximos locales
- Encuentra la secuencia óptima de volumen

### 2. **Adaptabilidad**
- Se ajusta automáticamente al nivel del usuario
- Considera la fatiga acumulada
- Personaliza los landmarks según composición corporal

### 3. **Prevención de Sobreentrenamiento**
- Descargas automáticas cuando fatiga > 0.6
- Respeta los límites MRV
- Balance entre progreso y recuperación

### 4. **Eficiencia Computacional**
- Complejidad: O(W × A) donde W = 12 semanas, A = 3 acciones
- Resolución instantánea (< 100ms)
- Escalable a ciclos más largos

### 5. **Fundamento Científico**
- Basado en Volume Landmarks (Israetel et al.)
- Respeta principios de sobrecarga progresiva
- Gestiona la fatiga mediante descargas estratégicas

---

## 📊 Métricas de Evaluación

Al finalizar un ciclo trimestral, el sistema evalúa:

```typescript
interface EvaluacionCiclo {
  nivelAnterior: string;        // ej: 'Intermedio'
  nivelNuevo: string;           // ej: 'Avanzado'
  adherencia: number;           // 0.85 = 85%
  progreso: string;             // 'Excelente' | 'Bueno' | 'Moderado'
  recomendacion: string;        // Feedback personalizado
}
```

### Criterios de Progresión

| Adherencia | XP Ganada | Resultado |
|------------|-----------|-----------|
| ≥ 80% | > 5000 XP | **Subida de nivel** |
| ≥ 60% | 3000-5000 XP | Progreso constante |
| < 60% | < 3000 XP | Ajustar objetivos |

### Recomendaciones Automáticas

- **Alta adherencia + XP alto**: Subir de nivel (Básico → Intermedio → Avanzado)
- **Baja adherencia**: Reducir frecuencia o ajustar objetivos
- **Progreso constante**: Mantener programa actual

---

## 🔗 Integración con Nivel 1 (Grafos)

La Programación Dinámica (Nivel 2) proporciona el **volumen objetivo semanal** que alimenta la optimización diaria (Nivel 1):

```
┌─────────────────────────────────────────────┐
│  NIVEL 2: Programación Dinámica             │
│  Decisión: Semana 5 → 14 series             │
└─────────────────────────────────────────────┘
                    │
                    ▼ (Volumen objetivo)
┌─────────────────────────────────────────────┐
│  NIVEL 1: Optimización de Grafos            │
│  Distribución: 14 series en 3 sesiones      │
│  • Lunes: 5 series (Pecho)                  │
│  • Miércoles: 5 series (Espalda)            │
│  • Viernes: 4 series (Piernas)              │
└─────────────────────────────────────────────┘
```

---

## 🚀 Uso Práctico

### Iniciar un Ciclo Trimestral

```typescript
// En el backend (NestJS)
const cycle = await dynamicProgrammingService.planQuarterlyCycle(userId);

console.log(cycle);
// {
//   startDate: '2025-01-01',
//   endDate: '2025-03-24',
//   weeklyDecisions: [...],
//   totalXPGained: 1605,
//   volumeProgression: [12, 14, 16, 8, 14, 16, 18, 11, ...]
// }
```

### Consultar Decisión de la Semana Actual

```typescript
const currentWeek = getCurrentWeek(cycle.startDate);
const decision = cycle.weeklyDecisions[currentWeek - 1];

console.log(`Semana ${currentWeek}:`);
console.log(`- Volumen: ${decision.estado.volumen} series`);
console.log(`- Fatiga: ${(decision.estado.fatiga * 100).toFixed(0)}%`);
console.log(`- Acción: ${decision.accion.tipo}`);
```

### Evaluar Ciclo Completado

```typescript
const evaluacion = await dynamicProgrammingService.evaluarCicloCompleto(userId);

console.log(evaluacion);
// {
//   nivelAnterior: 'Intermedio',
//   nivelNuevo: 'Avanzado',
//   adherencia: 0.85,
//   progreso: 'Excelente',
//   recomendacion: 'Progreso sobresaliente. Acceso a rutinas avanzadas.'
// }
```

---

## 📚 Referencias Científicas

1. **Israetel, M., Feather, J., Faleiro, T., & Juneau, C.** (2020). *Scientific Principles of Strength Training*. Renaissance Periodization.
   - Volume Landmarks (MEV, MAV, MRV)
   - Principios de periodización

2. **Schoenfeld, B. J., Ogborn, D., & Krieger, J. W.** (2017). *Dose-response relationship between weekly resistance training volume and increases in muscle mass*. Journal of Sports Sciences.
   - Relación volumen-hipertrofia

3. **Bellman, R.** (1957). *Dynamic Programming*. Princeton University Press.
   - Fundamentos matemáticos de la ecuación de Bellman

4. **Sutton, R. S., & Barto, A. G.** (2018). *Reinforcement Learning: An Introduction*. MIT Press.
   - Aplicación de RL a problemas secuenciales

---

## 🛠️ Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `dynamic-programming.service.ts` | Implementación principal del servicio |
| `graph-optimizer.service.ts` | Optimización de sesiones diarias (Nivel 1) |
| `load-management.service.ts` | Gestión de carga y recuperación |
| `rutinas.service.ts` | Orquestador de ambos niveles |
| `SISTEMA_OPTIMIZACION_V2.md` | Documentación completa del sistema |

---

## ✨ Conclusión

El sistema de **Programación Dinámica para Macrociclos** representa un enfoque científico y matemático avanzado para la planificación del entrenamiento de fuerza. Al utilizar la Ecuación de Bellman, el sistema no solo optimiza el presente, sino que también considera las consecuencias futuras de cada decisión, asegurando:

- ✅ Progresión sostenible sin sobreentrenamiento
- ✅ Maximización de ganancias musculares a largo plazo
- ✅ Adaptación personalizada a cada usuario
- ✅ Descargas estratégicas para recuperación óptima
- ✅ Gamificación mediante sistema XP y niveles

Este enfoque híbrido (Grafos + Programación Dinámica) posiciona a Muscle RPG como una aplicación única que combina ciencia del entrenamiento, matemáticas avanzadas y diseño de videojuegos.

---

**Desarrollado con ❤️ para Muscle RPG**  
*Versión 2.0 - Diciembre 2025*
