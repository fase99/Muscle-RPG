# Componente Setup - Sistema de Clasificación del Usuario

## Descripción General

El componente `SetupComponent` implementa un **formulario multi-paso** interactivo para recopilar todos los datos necesarios para el **algoritmo de clasificación multifactorial** del usuario.

## Características Principales

### 🎯 Sistema de Pasos (4 Etapas)

1. **Paso 1: Biometría** 📊
   - Edad (13-120 años)
   - Género biológico (para cálculos de composición)
   - Peso (kg)
   - Estatura (cm)

2. **Paso 2: Experiencia de Entrenamiento** 💪
   - Meses de experiencia con entrenamiento de resistencia
   - Nivel de actividad física (OMS):
     - Sedentario (0 pts)
     - Activo (10 pts)
     - Deportista (20 pts)

3. **Paso 3: Evaluación de Salud** 🏥
   - Checkbox para condiciones médicas de riesgo
   - Factor de seguridad (δ_salud)
   - Alertas visuales según el estado

4. **Paso 4: Composición Corporal** 📏 (Opcional)
   - **Método A**: Estimación automática por IMC (Deurenberg)
   - **Método B**: % de grasa corporal conocido
   - **Método C**: 7 Pliegues Cutáneos (Gold Standard)

### ✨ Funcionalidades

#### Indicador de Progreso Visual
```html
<div class="progress-indicator">
  <!-- Muestra paso actual y pasos completados -->
  - Estados: activo, completado, pendiente
  - Transiciones animadas
</div>
```

#### Validación en Tiempo Real
- Validación de campos requeridos
- Rangos de valores permitidos
- Botón "Siguiente" habilitado solo si el paso es válido

#### Método de 7 Pliegues Cutáneos
Cuando se selecciona este método, se muestran 7 campos para:
1. Tríceps
2. Deltoides (punto clavicular)
3. Pectoral
4. Cintura
5. Glúteo
6. Cuádriceps (vasto externo)
7. Gastrocnemio (gemelar)

Todos los valores en **milímetros (mm)**.

#### Pantalla de Resultados Completa
Muestra todos los datos calculados por el backend:

**Badge de Clasificación:**
- 🛡️ Básico (verde)
- ⚔️ Intermedio (azul)
- 👑 Avanzado (dorado)

**Métricas Principales:**
- Score RPG (S_RPG)
- Porcentaje de grasa corporal
- Multiplicador de composición (μ_comp)

**Parámetros de Entrenamiento:**
- Frecuencia semanal (días)
- RIR Target (repeticiones en reserva)
- Carga estimada (% 1RM)

**Desglose del Cálculo:**
- Puntaje de Experiencia (P_exp)
- Puntaje de Actividad (P_act)
- Factor de Seguridad (δ_salud)

## Estructura del Código

### TypeScript (setup.component.ts)

```typescript
export class SetupComponent {
  profileForm: FormGroup;
  result: any = null;
  currentStep: number = 1;
  totalSteps: number = 4;
  usarMetodo7Pliegues: boolean = false;

  // Navegación entre pasos
  nextStep()
  prevStep()
  canProceedToNextStep(): boolean

  // Manejo del método de medición
  onMetodoChange(event: any)

  // Envío al backend
  onSubmit()
}
```

### Métodos Clave

#### `canProceedToNextStep()`
Valida que el paso actual tenga todos los campos requeridos completos antes de permitir avanzar.

#### `onMetodoChange()`
Limpia los campos no utilizados según el método de medición seleccionado para evitar enviar datos innecesarios.

#### `onSubmit()`
Construye el payload adaptado al DTO del backend (`CreateProfileDto`):
- Convierte altura de cm a metros
- Agrega campos opcionales según el método seleccionado
- Envía POST a `http://localhost:3000/users/profile`

## Payload Enviado al Backend

### Ejemplo Mínimo (Estimación por IMC)
```json
{
  "age": 25,
  "gender": 1,
  "experienceMonths": 12,
  "weight": 75,
  "height": 1.75,
  "nivelactividad": "active",
  "condicionmedica": false
}
```

### Ejemplo con % de Grasa Conocido
```json
{
  "age": 25,
  "gender": 1,
  "experienceMonths": 12,
  "weight": 75,
  "height": 1.75,
  "nivelactividad": "active",
  "condicionmedica": false,
  "knownBodyFat": 18.5
}
```

### Ejemplo con 7 Pliegues (Gold Standard)
```json
{
  "age": 25,
  "gender": 1,
  "experienceMonths": 12,
  "weight": 75,
  "height": 1.75,
  "nivelactividad": "active",
  "condicionmedica": false,
  "pliegue_triceps": 12,
  "pliegue_deltoides": 10,
  "pliegue_pectoral": 8,
  "pliegue_cintura": 15,
  "pliegue_gluteo": 14,
  "pliegue_cuadriceps": 16,
  "pliegue_gastronemio": 11
}
```

## Response del Backend

```json
{
  "sRpg": 45.5,
  "level": "Intermedio",
  "estimatedBodyFat": 18.2,
  "compositionMultiplier": 1.0,
  "metodoCalculoPGC": "7 Pliegues (Gold Standard)",
  "puntajeExperiencia": 30,
  "puntajeActividad": 10,
  "factorSeguridad": 1,
  "frecuenciaSemanal": { "min": 3, "max": 4 },
  "rirTarget": { "min": 2, "max": 2 },
  "cargaEstimada": { "min": 75, "max": 80 }
}
```

## Estilos CSS

### Diseño Moderno
- Gradientes oscuros (#0a0e27 → #1a1f3a)
- Bordes iluminados con colores según estado
- Animaciones suaves (fadeIn, translateY)
- Efectos hover con elevación

### Indicadores Visuales
- **Verde** (#10b981): Completado / Básico
- **Azul** (#2563eb): Activo / Intermedio
- **Dorado** (#f59e0b): Gold Standard / Avanzado
- **Rojo** (#ef4444): Alertas de salud

### Responsive
- Grid adaptativo para formularios
- Diseño centrado con max-width: 900px
- Columnas automáticas para stats y parámetros

## Flujo de Usuario

```
Inicio
  ↓
Paso 1: Biometría → [Validar] → Siguiente
  ↓
Paso 2: Experiencia → [Validar] → Siguiente
  ↓
Paso 3: Salud → Siguiente
  ↓
Paso 4: Composición (opcional) → [Enviar]
  ↓
Backend procesa datos
  ↓
Mostrar resultados detallados
  ↓
[Comenzar Aventura] → Rutina
[Recalcular] → Volver a Paso 1
```

## Validaciones Frontend

- Edad: 13-120 años
- Peso: 30-300 kg
- Altura: 100-250 cm
- Experiencia: ≥ 0 meses
- Pliegues (si se usan): 1-50 mm
- % Grasa (si se usa): 3-60%

## Integración con Backend

### Endpoint
`POST http://localhost:3000/users/profile`

### Headers
```
Content-Type: application/json
```

### Error Handling
- Muestra alert si hay error de conexión
- Console.log del payload enviado para debugging
- Mensaje de error detallado en consola

## Mejoras Futuras

- [ ] Guardar progreso en localStorage
- [ ] Modo de edición de perfil existente
- [ ] Visualización de historico de mediciones
- [ ] Comparación de perfiles antes/después
- [ ] Exportar resultados en PDF
- [ ] Integración con medidores Bluetooth
- [ ] Tutorial interactivo para medir pliegues
- [ ] Calculadora de IMC en tiempo real

## Testing

### Casos de Prueba Sugeridos

1. **Flujo completo con estimación IMC**
2. **Flujo con % de grasa conocido**
3. **Flujo con 7 pliegues completos**
4. **Validación de campos obligatorios**
5. **Navegación hacia atrás sin perder datos**
6. **Cambio de método de medición**
7. **Usuario con condiciones médicas**
8. **Valores límite (min/max)**

## Notas Técnicas

- Componente standalone (no requiere módulo)
- Uso de ReactiveFormsModule para formularios
- RouterModule para navegación a /rutina
- DecimalPipe para formateo de números
- HttpClient para comunicación con API

## Dependencias

```typescript
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
```

---

**Actualizado:** Diciembre 11, 2025  
**Versión:** 2.0 - Sistema Multifactorial Completo
