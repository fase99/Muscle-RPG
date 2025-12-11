# Muscle RPG - Arquitectura Híbrida de Ejercicios

## 📋 Resumen de la Implementación

Se ha implementado una **arquitectura híbrida** que combina:
- **MongoDB local**: Almacena las reglas RPG del juego (nivel, XP, prerequisitos)
- **ExerciseDB API**: Proporciona datos visuales (nombres, GIFs, músculos objetivo)

## 🏗️ Estructura de Archivos Creados

```
backend/src/exercises/
├── schemas/
│   └── rpg-exercise-rule.schema.ts    # Schema Mongoose para reglas RPG
├── exercisedb.service.ts              # Cliente API de ExerciseDB
├── graph-builder.service.ts           # Fusión de datos MongoDB + API
├── exercises.controller.ts            # Endpoints REST
└── exercises.module.ts                # Módulo de NestJS
```

## 🚀 Cómo Usar

### 1. Configurar la API Key de ExerciseDB

1. Visita [RapidAPI - ExerciseDB](https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb)
2. Crea una cuenta gratuita
3. Suscríbete al plan gratuito (150 requests/día)
4. Copia tu API Key
5. Edita `backend/.env`:
   ```env
   EXERCISEDB_API_KEY=tu_api_key_aqui
   ```

### 2. Iniciar el Proyecto con Docker

```bash
# Desde la raíz del proyecto
docker-compose up -d --build
```

### 3. Poblar la Base de Datos

Ejecuta el endpoint de seeding para crear reglas RPG de ejemplo:

```bash
# Con PowerShell
Invoke-RestMethod -Uri http://localhost:3000/exercises/seed -Method POST

# O con curl
curl -X POST http://localhost:3000/exercises/seed
```

## 📡 Endpoints Disponibles

### GET `/exercises/graph`
Obtiene el grafo completo de ejercicios (fusión de datos RPG + visuales)

```bash
Invoke-RestMethod -Uri http://localhost:3000/exercises/graph
```

**Respuesta:**
```json
[
  {
    "id": "0001",
    "xp": 10,
    "fatigue": 5,
    "level": 1,
    "prerequisites": [],
    "unlocks": ["0002"],
    "name": "3/4 sit-up",
    "gifUrl": "https://api.exercisedb.io/image/...",
    "targetMuscle": "abs",
    "equipment": "body weight"
  }
]
```

### GET `/exercises/candidates?level=X&completed=id1,id2`
Obtiene ejercicios desbloqueados para un usuario

```bash
# Ejercicios para usuario nivel 2 que completó el ejercicio 0001
Invoke-RestMethod -Uri "http://localhost:3000/exercises/candidates?level=2&completed=0001"
```

### GET `/exercises/:id`
Obtiene un ejercicio específico

```bash
Invoke-RestMethod -Uri http://localhost:3000/exercises/0001
```

### GET `/exercises/:id/unlocks`
Obtiene qué ejercicios desbloquea este ejercicio

```bash
Invoke-RestMethod -Uri http://localhost:3000/exercises/0001/unlocks
```

## 🎮 Cómo Funciona la Fusión de Datos

### Paso 1: Datos en MongoDB (Reglas RPG)
```typescript
{
  externalId: "0001",      // ID de ExerciseDB
  levelRequired: 1,        // Nivel para desbloquear
  baseXP: 10,             // Ganancia de hipertrofia (g_j)
  fatigueCost: 5,         // Costo de stamina (f_j)
  prerequisites: [],      // Aristas del grafo (E)
  unlocks: ["0002"]       // Qué desbloquea
}
```

### Paso 2: Datos de ExerciseDB API (Visuales)
```typescript
{
  id: "0001",
  name: "3/4 sit-up",
  gifUrl: "https://...",
  target: "abs",
  equipment: "body weight"
}
```

### Paso 3: Fusión en GraphBuilderService
```typescript
{
  // De MongoDB
  id: "0001",
  xp: 10,
  fatigue: 5,
  level: 1,
  prerequisites: [],
  unlocks: ["0002"],
  
  // De ExerciseDB API
  name: "3/4 sit-up",
  gifUrl: "https://...",
  targetMuscle: "abs",
  equipment: "body weight"
}
```

## 📊 Ventajas de Esta Arquitectura

1. **Escalabilidad**: No necesitas guardar miles de GIFs en tu servidor
2. **Mantenimiento**: ExerciseDB actualiza los datos automáticamente
3. **Flexibilidad**: Puedes cambiar las reglas RPG sin afectar los datos visuales
4. **Eficiencia**: Caché de 1 hora para reducir llamadas a la API
5. **Fallback**: Si la API falla, usa datos mock para desarrollo

## 🔧 Agregar Más Ejercicios

### Opción 1: Directamente en MongoDB
```bash
# Conéctate a MongoDB
docker exec -it muscle-rpg-mongodb-1 mongosh -u admin -p muscleRPG2025

# Usa la base de datos
use muscle_rpg

# Inserta reglas RPG
db.rpg_exercise_rules.insertOne({
  externalId: "0004",
  levelRequired: 4,
  baseXP: 25,
  fatigueCost: 12,
  prerequisites: ["0003"],
  unlocks: ["0005"],
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Opción 2: Crear un Script de Seeding
Modifica `exercises.controller.ts` en el método `seedDatabase()` para agregar más ejercicios.

## 🧪 Testing Local (Sin API Key)

Si no tienes API Key, el sistema usará datos mock automáticamente. Esto es útil para desarrollo inicial.

## 📝 Próximos Pasos

1. **Algoritmo de Optimización**: Usar `GraphBuilderService.getCandidateExercises()` en el optimizador de rutinas
2. **Sistema de Progresión**: Guardar en BD qué ejercicios ha completado cada usuario
3. **Cálculo de XP**: Implementar la fórmula del paper para calcular ganancia de hipertrofia
4. **Frontend**: Consumir estos endpoints en Angular para mostrar ejercicios desbloqueados

## 🔗 Referencias

- [ExerciseDB API Documentation](https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb)
- [Mongoose Documentation](https://mongoosejs.com/)
- [NestJS HttpModule](https://docs.nestjs.com/techniques/http-module)
