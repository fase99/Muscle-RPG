# Cálculo de Ejercicios según Stamina - Muscle RPG

## 📊 Fórmula de Costos

### Costo por Ejercicio

```
Costo de Fatiga = Series × Fatiga_Base × Multiplicador_RIR
Costo de Tiempo = Series × Tiempo_Por_Serie
```

### Valores Base (v2.0 - Ajustados)

- **Fatiga Base por Serie**: 5 puntos
- **Tiempo por Serie**: 2.0 minutos
- **XP Base por Serie**: 15 puntos

### Multiplicadores RIR

| RIR | Nivel | Multiplicador | Descripción |
|-----|-------|---------------|-------------|
| 3 | Básico | 0.85x | Menos intenso, menos fatiga |
| 2 | Intermedio | 1.0x | Intensidad estándar |
| 0-1 | Avanzado | 1.2x | Máxima intensidad, más fatiga |

---

## 🎯 Ejemplos de Cálculo

### Usuario Básico (Nivel 1-35)

**Configuración**:
- Stamina: 100
- RIR: 3 (Multiplicador: 0.85)
- Series por ejercicio: 3

**Costo por Ejercicio**:
```
Fatiga = 3 series × 5 fatiga × 0.85 = 12.75 ≈ 13 puntos
Tiempo = 3 series × 2.0 min = 6 minutos
XP = 3 series × 15 xp × 0.85 = 38.25 ≈ 38 puntos
```

**Ejercicios posibles**:
```
Stamina disponible: 100
Fatiga por ejercicio: 13
Ejercicios máximos: 100 ÷ 13 ≈ 7-8 ejercicios
```

---

### Usuario Intermedio (Nivel 36-65)

**Configuración**:
- Stamina: 100
- RIR: 2 (Multiplicador: 1.0)
- Series por ejercicio: 4

**Costo por Ejercicio**:
```
Fatiga = 4 series × 5 fatiga × 1.0 = 20 puntos
Tiempo = 4 series × 2.0 min = 8 minutos
XP = 4 series × 15 xp × 1.0 = 60 puntos
```

**Ejercicios posibles**:
```
Stamina disponible: 100
Fatiga por ejercicio: 20
Ejercicios máximos: 100 ÷ 20 = 5 ejercicios
```

---

### Usuario Avanzado (Nivel 66+)

**Configuración**:
- Stamina: 100
- RIR: 1 (Multiplicador: 1.2)
- Series por ejercicio: 5

**Costo por Ejercicio**:
```
Fatiga = 5 series × 5 fatiga × 1.2 = 30 puntos
Tiempo = 5 series × 2.0 min = 10 minutos
XP = 5 series × 15 xp × 1.2 = 90 puntos
```

**Ejercicios posibles**:
```
Stamina disponible: 100
Fatiga por ejercicio: 30
Ejercicios máximos: 100 ÷ 30 ≈ 3 ejercicios
```

---

## 📈 Tabla de Referencia Rápida

| Nivel Usuario | Series | RIR | Fatiga/Ej | Tiempo/Ej | XP/Ej | Ejercicios (100 stamina) |
|---------------|--------|-----|-----------|-----------|-------|--------------------------|
| Básico | 3 | 3 | 13 | 6 min | 38 | 7-8 |
| Intermedio | 4 | 2 | 20 | 8 min | 60 | 5 |
| Avanzado | 5 | 1 | 30 | 10 min | 90 | 3 |

---

## 🔄 Ajuste Dinámico según Stamina

### Stamina Baja (< 50)

Si el usuario llega con **stamina reducida** (ej: 40/100):

**Usuario Intermedio con 40 stamina**:
```
Stamina: 40
Fatiga por ejercicio: 20
Ejercicios: 40 ÷ 20 = 2 ejercicios

⚠️ Advertencia: "Rutina reducida por baja stamina. Considera descansar."
```

### Stamina Media (50-80)

**Usuario Intermedio con 70 stamina**:
```
Stamina: 70
Fatiga por ejercicio: 20
Ejercicios: 70 ÷ 20 = 3-4 ejercicios
```

### Stamina Alta (80-100)

**Usuario Intermedio con 100 stamina**:
```
Stamina: 100
Fatiga por ejercicio: 20
Ejercicios: 100 ÷ 20 = 5 ejercicios
```

---

## 🎮 Progresión del Sistema

### Evolución de Capacidad

A medida que el usuario sube de nivel:

1. **Nivel 1-10**: 
   - Stamina máxima: 80-90
   - Ejercicios: 6-7 (Básico)

2. **Nivel 11-35**:
   - Stamina máxima: 90-100
   - Ejercicios: 7-8 (Básico)

3. **Nivel 36-50**:
   - Stamina máxima: 100-110
   - Ejercicios: 5-6 (Intermedio)

4. **Nivel 51-65**:
   - Stamina máxima: 110-120
   - Ejercicios: 5-6 (Intermedio)

5. **Nivel 66+**:
   - Stamina máxima: 120-150
   - Ejercicios: 4-5 (Avanzado)

**Nota**: Aunque los ejercicios disminuyen, el XP total aumenta por la mayor intensidad.

---

## 🧮 Lógica del Algoritmo

### Restricciones del Greedy Algorithm

```typescript
PARA cada ejercicio en orden de ratio XP/(Tiempo+Fatiga):
  SI tiempo_actual + costo_tiempo <= 120 min:
    SI fatiga_actual + costo_fatiga <= stamina_disponible:
      SI balance_muscular <= 40%:
        AGREGAR ejercicio
        ACTUALIZAR contadores
      FIN SI
    FIN SI
  FIN SI
FIN PARA
```

### Prioridad de Restricciones

1. **Tiempo Total** ≤ 120 minutos (HARD)
2. **Fatiga Total** ≤ Stamina Disponible (HARD)
3. **Balance Muscular** ≤ 40% por grupo (SOFT con mínimo 3 ejercicios)

---

## 📊 Ejemplos Reales de Rutinas

### Rutina Básica (100 stamina)

```
Ejercicio 1: Sentadillas        - 13 fatiga, 6 min, 38 XP
Ejercicio 2: Press Banca        - 13 fatiga, 6 min, 38 XP
Ejercicio 3: Remo con Barra     - 13 fatiga, 6 min, 38 XP
Ejercicio 4: Press Militar      - 13 fatiga, 6 min, 38 XP
Ejercicio 5: Curl Bíceps        - 13 fatiga, 6 min, 38 XP
Ejercicio 6: Extensión Tríceps  - 13 fatiga, 6 min, 38 XP
Ejercicio 7: Elevación Gemelos  - 13 fatiga, 6 min, 38 XP

TOTAL: 91 fatiga, 42 min, 266 XP
```

### Rutina Intermedia (100 stamina)

```
Ejercicio 1: Sentadillas        - 20 fatiga, 8 min, 60 XP
Ejercicio 2: Press Banca        - 20 fatiga, 8 min, 60 XP
Ejercicio 3: Remo con Barra     - 20 fatiga, 8 min, 60 XP
Ejercicio 4: Press Militar      - 20 fatiga, 8 min, 60 XP
Ejercicio 5: Peso Muerto        - 20 fatiga, 8 min, 60 XP

TOTAL: 100 fatiga, 40 min, 300 XP
```

### Rutina Avanzada (100 stamina)

```
Ejercicio 1: Sentadillas        - 30 fatiga, 10 min, 90 XP
Ejercicio 2: Press Banca        - 30 fatiga, 10 min, 90 XP
Ejercicio 3: Peso Muerto        - 30 fatiga, 10 min, 90 XP

TOTAL: 90 fatiga, 30 min, 270 XP
```

---

## ⚙️ Configuración Técnica

### Valores Ajustables (backend/src/rutinas/graph-optimizer.service.ts)

```typescript
// Línea ~150
const tiempoPorSerie = 2.0;      // Ajustar tiempo por serie
const fatigaBasePorSerie = 5;    // Ajustar fatiga base
const xpBasePorSerie = 15;       // Ajustar XP base
```

### Aumentar Ejercicios

Para permitir **MÁS ejercicios** con la misma stamina:

```typescript
const fatigaBasePorSerie = 4;  // Reducir de 5 a 4
// Resultado: ~6-7 ejercicios intermedios en vez de 5
```

### Reducir Ejercicios

Para **MENOS ejercicios** (más intensos):

```typescript
const fatigaBasePorSerie = 6;  // Aumentar de 5 a 6
// Resultado: ~4 ejercicios intermedios en vez de 5
```

---

## 🎯 Recomendaciones

### Para Desarrollo Equilibrado

- **Básicos**: 6-8 ejercicios por sesión
- **Intermedios**: 5-6 ejercicios por sesión
- **Avanzados**: 3-5 ejercicios por sesión

### Para Volumen Alto

Aumentar stamina máxima del usuario:

```typescript
// Al subir de nivel
user.staminaMaxima = 100 + (nivel * 2); // +2 stamina por nivel
```

Ejemplo:
- Nivel 1: 100 stamina
- Nivel 10: 120 stamina
- Nivel 20: 140 stamina
- Nivel 50: 200 stamina

---

**Última actualización**: Diciembre 2025 - v2.0  
**Ajuste de costos**: Fatiga base reducida de 8 a 5 para rutinas más completas
