# Guía Rápida: Cómo Crear Rutinas en Muscle RPG v2.0

## 🎯 Flujo Completo para Generar Rutinas

### Paso 1: Asegurar que el Usuario tiene Perfil

Antes de generar rutinas, el usuario **debe** completar el perfilamiento:

```bash
# Verificar si el usuario tiene perfil
GET http://localhost:3000/users/:userId/has-profile

# Si no tiene perfil, completar en el frontend:
# http://localhost:4200/setup
```

---

## 📝 MÉTODO 1: Generar Rutina Diaria (Recomendado)

Este es el método principal para generar la "Misión Diaria" del usuario.

### Request

```bash
POST http://localhost:3000/rutinas/generate/daily
Content-Type: application/json

{
  "userId": "675a5e4c8f1b2c3d4e5f6a7b",
  "availableTimeMinutes": 120,
  "currentStamina": 85
}
```

### Parámetros

- `userId` (requerido): ID del usuario
- `availableTimeMinutes` (opcional, default: 120): Tiempo disponible en minutos
- `currentStamina` (opcional): Stamina actual del usuario. Si no se proporciona, se obtiene del documento User

### Response Exitosa

```json
{
  "message": "¡Misión Diaria generada! 💪",
  "rutina": {
    "_id": "675a5e4c8f1b2c3d4e5f6a7c",
    "usuarioId": "675a5e4c8f1b2c3d4e5f6a7b",
    "nombre": "Misión Diaria - 12/12/2025",
    "descripcion": "Rutina optimizada por IA. XP Estimado: 450",
    "cycleType": "daily-session",
    "goal": "hypertrophy",
    "ejercicios": [
      {
        "externalId": "0001",
        "nombre": "Exercise 0001",
        "series": 4,
        "repeticiones": 10,
        "peso": 0,
        "costoTiempo": 15,
        "costoFatiga": 12,
        "estimuloXP": 85,
        "completado": false,
        "rir": 2,
        "muscleTargets": {
          "STR": 0.8,
          "AGI": 0.2,
          "STA": 0.3,
          "INT": 0,
          "DEX": 0.1,
          "END": 0.4
        },
        "notas": "RIR 2 - Repeticiones en Reserva"
      }
      // ... más ejercicios
    ],
    "tiempoTotal": 95,
    "fatigaTotal": 78,
    "xpTotalEstimado": 450,
    "volumeLandmarks": {
      "MEV": 12,
      "MAV": 18,
      "MRV": 24
    },
    "currentVolume": 21,
    "activa": true,
    "algorithmVersion": "2.0-DAG"
  },
  "stats": {
    "ejercicios": 6,
    "xpEstimado": 450,
    "tiempo": "95 minutos",
    "stamina": "78 / 85"
  }
}
```

---

## 📊 MÉTODO 2: Planificar Ciclo Trimestral

Este método genera un plan de 12 semanas usando Programación Dinámica.

### Request

```bash
POST http://localhost:3000/rutinas/plan/quarterly/675a5e4c8f1b2c3d4e5f6a7b
```

### Response Exitosa

```json
{
  "message": "Ciclo trimestral planificado exitosamente 🎯",
  "cycle": {
    "startDate": "2025-12-12T00:00:00.000Z",
    "endDate": "2026-03-12T00:00:00.000Z",
    "weeklyDecisions": [
      {
        "semana": 1,
        "estado": {
          "volumen": 12,
          "fatiga": 0.25
        },
        "accion": {
          "tipo": "increase",
          "delta": 2
        },
        "valor": 156.5,
        "ganancia": 120
      },
      {
        "semana": 2,
        "estado": {
          "volumen": 14,
          "fatiga": 0.31
        },
        "accion": {
          "tipo": "increase",
          "delta": 2
        },
        "valor": 178.2,
        "ganancia": 140
      }
      // ... semanas 3-12
    ],
    "totalXPGained": 18500,
    "averageAdherence": 0.85,
    "finalFatigue": 0.42,
    "volumeProgression": [12, 14, 16, 18, 18, 18, 18, 9, 16, 18, 18, 20]
  },
  "rutinaId": "675a5e4c8f1b2c3d4e5f6a7d",
  "summary": {
    "semanas": 12,
    "xpTotal": 18500,
    "fechaInicio": "2025-12-12T00:00:00.000Z",
    "fechaFin": "2026-03-12T00:00:00.000Z"
  }
}
```

**Nota**: Este plan se guarda en la BD como una rutina especial tipo `quarterly-cycle` que sirve como referencia para el sistema.

---

## 📈 MÉTODO 3: Evaluar Ciclo Completado

Después de 3 meses, evalúa el progreso y recalcula el nivel del usuario.

### Request

```bash
GET http://localhost:3000/rutinas/evaluate/quarterly/675a5e4c8f1b2c3d4e5f6a7b
```

### Response Exitosa

```json
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

## 🔧 MÉTODO 4: Métodos Legacy (Compatibilidad)

Para crear rutinas manualmente (no recomendado, pero disponible):

```bash
POST http://localhost:3000/rutinas
Content-Type: application/json

{
  "usuarioId": "675a5e4c8f1b2c3d4e5f6a7b",
  "nombre": "Rutina Personalizada",
  "descripcion": "Mi rutina custom",
  "tipo": "Hipertrofia",
  "ejercicios": [
    {
      "nombre": "Press Banca",
      "series": 4,
      "repeticiones": 10,
      "peso": 80,
      "completado": false
    }
  ],
  "diasSemana": ["Lunes", "Miércoles", "Viernes"],
  "duracionEstimada": 90
}
```

---

## 🎮 Integración con el Frontend

### Ejemplo en Angular/TypeScript

```typescript
// rutina.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RutinaService {
  private baseUrl = 'http://localhost:3000/rutinas';

  constructor(private http: HttpClient) {}

  // Generar misión diaria
  generateDailyRoutine(
    userId: string, 
    availableTime: number = 120,
    stamina?: number
  ): Observable<any> {
    return this.http.post(`${this.baseUrl}/generate/daily`, {
      userId,
      availableTimeMinutes: availableTime,
      currentStamina: stamina
    });
  }

  // Planificar ciclo trimestral
  planQuarterlyCycle(userId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/plan/quarterly/${userId}`, {});
  }

  // Evaluar ciclo
  evaluateQuarterlyCycle(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/evaluate/quarterly/${userId}`);
  }

  // Obtener rutinas del usuario
  getUserRoutines(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/user/${userId}`);
  }

  // Marcar ejercicio como completado
  markExerciseComplete(
    rutinaId: string, 
    exerciseIndex: number, 
    completed: boolean
  ): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/${rutinaId}/ejercicio/${exerciseIndex}`,
      { completado: completed }
    );
  }

  // Marcar rutina completada
  completeRoutine(rutinaId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${rutinaId}/completar`, {});
  }
}
```

### Uso en el Componente

```typescript
// rutina.component.ts
export class RutinaComponent implements OnInit {
  rutinaDiaria: any;
  loading = false;

  constructor(
    private rutinaService: RutinaService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.generateDailyMission();
  }

  generateDailyMission() {
    this.loading = true;
    const userId = this.authService.getCurrentUser()?._id;
    
    if (!userId) {
      console.error('Usuario no autenticado');
      return;
    }

    this.rutinaService.generateDailyRoutine(userId)
      .subscribe({
        next: (response) => {
          this.rutinaDiaria = response.rutina;
          this.loading = false;
          console.log('Misión diaria generada:', response.stats);
        },
        error: (error) => {
          console.error('Error generando rutina:', error);
          this.loading = false;
          
          if (error.status === 404 && error.error.message.includes('Perfil')) {
            // Redirigir a /setup
            this.router.navigate(['/setup']);
          }
        }
      });
  }

  completeExercise(index: number) {
    this.rutinaService.markExerciseComplete(
      this.rutinaDiaria._id, 
      index, 
      true
    ).subscribe({
      next: () => {
        this.rutinaDiaria.ejercicios[index].completado = true;
        this.checkIfAllCompleted();
      }
    });
  }

  checkIfAllCompleted() {
    const allCompleted = this.rutinaDiaria.ejercicios.every(
      (ej: any) => ej.completado
    );

    if (allCompleted) {
      this.rutinaService.completeRoutine(this.rutinaDiaria._id)
        .subscribe({
          next: () => {
            console.log('¡Rutina completada! 🎉');
            // Actualizar XP y Stamina del usuario
            this.updateUserProgress();
          }
        });
    }
  }

  updateUserProgress() {
    const xpGanada = this.rutinaDiaria.xpTotalEstimado;
    const staminaUsada = this.rutinaDiaria.fatigaTotal;
    
    // Actualizar en el backend
    this.userService.updateExperience(userId, xpGanada).subscribe();
    this.userService.updateStamina(userId, staminaUsada).subscribe();
  }
}
```

---

## ⚠️ Prerequisitos IMPORTANTES

### 1. Base de Datos de Ejercicios

Antes de generar rutinas, necesitas poblar la colección `rpg_exercise_rules`:

```javascript
// mongo-init/seed-exercises.js
db.rpg_exercise_rules.insertMany([
  {
    externalId: "0001",
    levelRequired: 1,
    baseXP: 85,
    fatigueCost: 12,
    executionTime: 3, // minutos por serie
    muscleTargets: {
      STR: 0.8,
      AGI: 0.2,
      STA: 0.3,
      INT: 0,
      DEX: 0.1,
      END: 0.4
    },
    prerequisites: [],
    unlocks: ["0002", "0003"]
  },
  {
    externalId: "0002",
    levelRequired: 2,
    baseXP: 95,
    fatigueCost: 15,
    executionTime: 3.5,
    muscleTargets: {
      STR: 0.7,
      AGI: 0.3,
      STA: 0.4,
      INT: 0,
      DEX: 0.2,
      END: 0.5
    },
    prerequisites: ["0001"],
    unlocks: ["0004"]
  }
  // ... más ejercicios
]);
```

### 2. Usuario con Perfil Completo

```bash
# 1. Registrar usuario
POST http://localhost:3000/auth/register

# 2. Completar perfilamiento
POST http://localhost:3000/users/profile

# 3. AHORA sí puedes generar rutinas
POST http://localhost:3000/rutinas/generate/daily
```

---

## 🚀 Flujo Completo del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                  MUSCLE RPG - Flujo                     │
└─────────────────────────────────────────────────────────┘

1. REGISTRO
   Usuario → /auth/register
   
2. PERFILAMIENTO (una vez)
   Usuario → /setup (frontend)
          → /users/profile (backend)
   Sistema calcula: S_RPG, Nivel, Volume Landmarks

3. RUTINA DIARIA (cada día)
   Usuario → Botón "Generar Misión Diaria"
          → /rutinas/generate/daily
   Sistema:
   - Construye grafo de ejercicios disponibles
   - Aplica restricciones (Tiempo, Stamina)
   - Optimiza: max(XP)
   - Retorna rutina del día

4. EJECUCIÓN
   Usuario completa ejercicios
   Sistema:
   - Actualiza XP (+EstímuloXP)
   - Actualiza Stamina (-CostoFatiga)
   - Actualiza atributos (STR, AGI, etc.)

5. CICLO TRIMESTRAL (cada 3 meses)
   Sistema → /rutinas/plan/quarterly/:userId
   - Calcula progresión de volumen (12 semanas)
   - Programa deloads automáticos
   - Ajusta según Volume Landmarks

6. EVALUACIÓN (fin de ciclo)
   Sistema → /rutinas/evaluate/quarterly/:userId
   - Calcula adherencia
   - Recalcula S_RPG
   - ¿Subir de nivel? → Desbloquear ejercicios
```

---

## 🐛 Troubleshooting

### Error: "Perfil no encontrado"
```
Solución: El usuario debe completar /setup primero
```

### Error: "No hay ejercicios disponibles"
```
Solución: Poblar la colección rpg_exercise_rules en MongoDB
```

### Rutina vacía (0 ejercicios)
```
Causas posibles:
1. Stamina del usuario = 0
2. Todos los ejercicios requieren prerequisites no cumplidos
3. Base de datos vacía

Solución: 
- Verificar user.staminaActual > 0
- Asegurar que hay ejercicios con levelRequired ≤ nivel del usuario
- Verificar que hay ejercicios sin prerequisites
```

### XP no se actualiza después de completar rutina
```
Solución: Implementar llamadas a:
- PATCH /users/:id/experiencia
- PATCH /users/:id/stamina
```

---

## 📊 Monitoreo y Logs

El sistema genera logs detallados:

```
[GraphOptimizer] Iniciando optimización de sesión diaria...
[GraphOptimizer] Usuario Nivel: Intermedio, Stamina: 85/100
[GraphOptimizer] Ejercicios disponibles: 15
[GraphOptimizer] Camino óptimo encontrado: 6 ejercicios
[GraphOptimizer] XP Total: 450, Tiempo: 95min, Fatiga: 78

[DynamicProgramming] Planificando ciclo trimestral...
[DynamicProgramming] Landmarks - MEV: 12, MAV: 18, MRV: 24
[DynamicProgramming] Semana 4: Deload obligatorio (fatiga: 0.68)
[DynamicProgramming] Ciclo planificado: 12 semanas
[DynamicProgramming] XP Total Proyectado: 18500
```

Revisa estos logs en la consola del backend para debugging.
