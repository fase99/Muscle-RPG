// Script para poblar la base de datos con ejercicios de ejemplo
// Ejecutar en MongoDB: mongosh < seed-exercises.js

use musclerpm; // Cambia esto al nombre de tu base de datos

// Limpiar colección existente (opcional, comentar si no quieres borrar)
// db.rpg_exercise_rules.deleteMany({});

print("Insertando ejercicios en rpg_exercise_rules...");

// ========== NIVEL 1: BÁSICO (Ejercicios Fundamentales) ==========

db.rpg_exercise_rules.insertMany([
  // 1. PRESS BANCA (Pecho principal)
  {
    externalId: "0001",
    levelRequired: 1,
    baseXP: 100,
    fatigueCost: 15,
    executionTime: 3,
    muscleTargets: {
      STR: 0.9, // Fuerza primaria
      AGI: 0.1,
      STA: 0.3,
      INT: 0,
      DEX: 0.2,
      END: 0.4
    },
    prerequisites: [],
    unlocks: ["0002", "0010"],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 2. SENTADILLA (Piernas fundamental)
  {
    externalId: "0002",
    levelRequired: 1,
    baseXP: 120,
    fatigueCost: 20,
    executionTime: 3.5,
    muscleTargets: {
      STR: 0.8,
      AGI: 0.3,
      STA: 0.5,
      INT: 0,
      DEX: 0.2,
      END: 0.7
    },
    prerequisites: [],
    unlocks: ["0003", "0011"],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 3. PESO MUERTO (Espalda baja + piernas)
  {
    externalId: "0003",
    levelRequired: 2,
    baseXP: 130,
    fatigueCost: 25,
    executionTime: 3.5,
    muscleTargets: {
      STR: 1.0,
      AGI: 0.2,
      STA: 0.4,
      INT: 0,
      DEX: 0.3,
      END: 0.8
    },
    prerequisites: ["0002"],
    unlocks: ["0012"],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 4. REMO CON BARRA (Espalda)
  {
    externalId: "0004",
    levelRequired: 1,
    baseXP: 95,
    fatigueCost: 14,
    executionTime: 3,
    muscleTargets: {
      STR: 0.7,
      AGI: 0.2,
      STA: 0.3,
      INT: 0,
      DEX: 0.4,
      END: 0.5
    },
    prerequisites: [],
    unlocks: ["0005", "0013"],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 5. PRESS MILITAR (Hombros)
  {
    externalId: "0005",
    levelRequired: 1,
    baseXP: 85,
    fatigueCost: 12,
    executionTime: 2.5,
    muscleTargets: {
      STR: 0.6,
      AGI: 0.3,
      STA: 0.3,
      INT: 0,
      DEX: 0.5,
      END: 0.4
    },
    prerequisites: [],
    unlocks: ["0006", "0014"],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 6. DOMINADAS (Espalda + Bíceps)
  {
    externalId: "0006",
    levelRequired: 2,
    baseXP: 110,
    fatigueCost: 18,
    executionTime: 3,
    muscleTargets: {
      STR: 0.7,
      AGI: 0.4,
      STA: 0.3,
      INT: 0,
      DEX: 0.6,
      END: 0.5
    },
    prerequisites: ["0004"],
    unlocks: ["0015"],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 7. CURL DE BÍCEPS (Brazos)
  {
    externalId: "0007",
    levelRequired: 1,
    baseXP: 60,
    fatigueCost: 8,
    executionTime: 2,
    muscleTargets: {
      STR: 0.4,
      AGI: 0.2,
      STA: 0.2,
      INT: 0,
      DEX: 0.7,
      END: 0.3
    },
    prerequisites: [],
    unlocks: ["0016"],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 8. EXTENSIONES DE TRÍCEPS
  {
    externalId: "0008",
    levelRequired: 1,
    baseXP: 55,
    fatigueCost: 7,
    executionTime: 2,
    muscleTargets: {
      STR: 0.4,
      AGI: 0.2,
      STA: 0.2,
      INT: 0,
      DEX: 0.6,
      END: 0.3
    },
    prerequisites: [],
    unlocks: ["0017"],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 9. PLANCHA (Core)
  {
    externalId: "0009",
    levelRequired: 1,
    baseXP: 40,
    fatigueCost: 5,
    executionTime: 1.5,
    muscleTargets: {
      STR: 0.3,
      AGI: 0.2,
      STA: 0.5,
      INT: 0,
      DEX: 0.3,
      END: 0.8
    },
    prerequisites: [],
    unlocks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // ========== NIVEL 2: INTERMEDIO ==========

  // 10. PRESS INCLINADO (Pecho superior)
  {
    externalId: "0010",
    levelRequired: 3,
    baseXP: 105,
    fatigueCost: 16,
    executionTime: 3,
    muscleTargets: {
      STR: 0.8,
      AGI: 0.2,
      STA: 0.3,
      INT: 0,
      DEX: 0.3,
      END: 0.4
    },
    prerequisites: ["0001"],
    unlocks: ["0018"],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 11. ZANCADAS (Piernas - unilateral)
  {
    externalId: "0011",
    levelRequired: 3,
    baseXP: 115,
    fatigueCost: 19,
    executionTime: 3.5,
    muscleTargets: {
      STR: 0.7,
      AGI: 0.5,
      STA: 0.5,
      INT: 0,
      DEX: 0.4,
      END: 0.6
    },
    prerequisites: ["0002"],
    unlocks: ["0019"],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 12. PESO MUERTO RUMANO (Isquiotibiales)
  {
    externalId: "0012",
    levelRequired: 3,
    baseXP: 120,
    fatigueCost: 22,
    executionTime: 3,
    muscleTargets: {
      STR: 0.8,
      AGI: 0.2,
      STA: 0.4,
      INT: 0,
      DEX: 0.3,
      END: 0.7
    },
    prerequisites: ["0003"],
    unlocks: ["0020"],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 13. REMO EN MÁQUINA (Espalda - más aislado)
  {
    externalId: "0013",
    levelRequired: 3,
    baseXP: 90,
    fatigueCost: 13,
    executionTime: 2.5,
    muscleTargets: {
      STR: 0.6,
      AGI: 0.2,
      STA: 0.3,
      INT: 0,
      DEX: 0.5,
      END: 0.4
    },
    prerequisites: ["0004"],
    unlocks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 14. ELEVACIONES LATERALES (Hombros)
  {
    externalId: "0014",
    levelRequired: 3,
    baseXP: 70,
    fatigueCost: 10,
    executionTime: 2,
    muscleTargets: {
      STR: 0.4,
      AGI: 0.3,
      STA: 0.3,
      INT: 0,
      DEX: 0.6,
      END: 0.4
    },
    prerequisites: ["0005"],
    unlocks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 15. DOMINADAS LASTRADAS (Avanzado)
  {
    externalId: "0015",
    levelRequired: 4,
    baseXP: 140,
    fatigueCost: 23,
    executionTime: 3.5,
    muscleTargets: {
      STR: 0.9,
      AGI: 0.4,
      STA: 0.4,
      INT: 0,
      DEX: 0.7,
      END: 0.6
    },
    prerequisites: ["0006"],
    unlocks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // ========== NIVEL 3: AVANZADO ==========

  // 16. CURL CONCENTRADO (Bíceps - aislado)
  {
    externalId: "0016",
    levelRequired: 4,
    baseXP: 65,
    fatigueCost: 9,
    executionTime: 2,
    muscleTargets: {
      STR: 0.5,
      AGI: 0.2,
      STA: 0.2,
      INT: 0,
      DEX: 0.8,
      END: 0.3
    },
    prerequisites: ["0007"],
    unlocks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 17. FONDOS EN PARALELAS (Tríceps + Pecho)
  {
    externalId: "0017",
    levelRequired: 4,
    baseXP: 100,
    fatigueCost: 17,
    executionTime: 3,
    muscleTargets: {
      STR: 0.7,
      AGI: 0.3,
      STA: 0.3,
      INT: 0,
      DEX: 0.5,
      END: 0.5
    },
    prerequisites: ["0008"],
    unlocks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 18. PRESS DECLINADO (Pecho inferior)
  {
    externalId: "0018",
    levelRequired: 5,
    baseXP: 110,
    fatigueCost: 17,
    executionTime: 3,
    muscleTargets: {
      STR: 0.9,
      AGI: 0.2,
      STA: 0.3,
      INT: 0,
      DEX: 0.3,
      END: 0.4
    },
    prerequisites: ["0010"],
    unlocks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 19. PISTOL SQUATS (Piernas - unilateral avanzado)
  {
    externalId: "0019",
    levelRequired: 5,
    baseXP: 130,
    fatigueCost: 24,
    executionTime: 4,
    muscleTargets: {
      STR: 0.8,
      AGI: 0.7,
      STA: 0.6,
      INT: 0,
      DEX: 0.6,
      END: 0.7
    },
    prerequisites: ["0011"],
    unlocks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 20. PESO MUERTO SUMO (Variante avanzada)
  {
    externalId: "0020",
    levelRequired: 5,
    baseXP: 135,
    fatigueCost: 26,
    executionTime: 3.5,
    muscleTargets: {
      STR: 1.0,
      AGI: 0.3,
      STA: 0.5,
      INT: 0,
      DEX: 0.4,
      END: 0.8
    },
    prerequisites: ["0012"],
    unlocks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print("✅ Ejercicios insertados exitosamente!");

// Verificar inserción
const count = db.rpg_exercise_rules.countDocuments();
print(`Total de ejercicios en la base de datos: ${count}`);

// Mostrar algunos ejemplos
print("\n📋 Ejemplos de ejercicios insertados:");
db.rpg_exercise_rules.find().limit(5).forEach(exercise => {
  print(`  - ${exercise.externalId}: Level ${exercise.levelRequired}, XP ${exercise.baseXP}, Fatiga ${exercise.fatigueCost}`);
});

print("\n🎯 Para usar estos ejercicios:");
print("1. Asegúrate de que el usuario tenga un perfil creado");
print("2. Llama a: POST /rutinas/generate/daily");
print("3. El sistema seleccionará ejercicios según el nivel del usuario");
