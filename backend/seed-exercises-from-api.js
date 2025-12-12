const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = 'mongodb+srv://admin:GvZvmpJM504OknCU@cluster0.vlz4jqr.mongodb.net/?retryWrites=true&w=majority';

// Mapeo de músculos a atributos RPG
const muscleToRPG = {
  // CHEST -> STR (fuerza superior)
  'pectorals': { STR: 0.7, END: 0.3 },
  'chest': { STR: 0.7, END: 0.3 },
  
  // BACK -> STR + END
  'lats': { STR: 0.5, END: 0.5 },
  'traps': { STR: 0.6, END: 0.4 },
  'upper back': { STR: 0.5, END: 0.5 },
  'lower back': { STR: 0.4, STA: 0.3, END: 0.3 },
  
  // LEGS -> STR + STA
  'quads': { STR: 0.5, STA: 0.5 },
  'quadriceps': { STR: 0.5, STA: 0.5 },
  'hamstrings': { STR: 0.4, STA: 0.4, AGI: 0.2 },
  'glutes': { STR: 0.5, STA: 0.5 },
  'calves': { STA: 0.6, AGI: 0.4 },
  
  // SHOULDERS -> STR + DEX
  'delts': { STR: 0.6, DEX: 0.4 },
  'deltoids': { STR: 0.6, DEX: 0.4 },
  'shoulders': { STR: 0.6, DEX: 0.4 },
  
  // ARMS -> STR + DEX
  'biceps': { STR: 0.7, DEX: 0.3 },
  'triceps': { STR: 0.7, DEX: 0.3 },
  'forearms': { STR: 0.5, DEX: 0.5 },
  
  // CORE -> STA + END
  'abs': { STA: 0.6, END: 0.4 },
  'abdominals': { STA: 0.6, END: 0.4 },
  'core': { STA: 0.5, END: 0.5 },
  'obliques': { STA: 0.5, END: 0.5 },
  
  // Otros
  'cardiovascular system': { STA: 0.5, END: 0.5 },
  'spine': { STA: 0.5, END: 0.5 },
};

// Calcular dificultad basado en equipamiento
function getDifficultyFromEquipment(equipment) {
  const difficultyMap = {
    'body weight': 1,
    'assisted': 1,
    'band': 1,
    'dumbbell': 2,
    'cable': 2,
    'kettlebell': 2,
    'barbell': 3,
    'smith machine': 3,
    'leverage machine': 3,
    'sled machine': 4,
    'olympic barbell': 5,
  };
  
  return difficultyMap[equipment] || 2;
}

async function seedExercises() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('🔗 Conectado a MongoDB');

    const db = client.db('muscleRPG');
    const collection = db.collection('rpg_exercise_rules');

    // Leer ejercicios desde el archivo local
    const exercisesPath = path.join(__dirname, 'data-exercises', 'exercises.json');
    const exercisesData = JSON.parse(fs.readFileSync(exercisesPath, 'utf-8'));
    console.log(`📖 Cargados ${exercisesData.length} ejercicios desde exercises.json`);

    // Grupos musculares objetivo (15 ejercicios cada uno = 90 total)
    const targetGroups = {
      chest: ['pectorals', 'chest'],
      back: ['lats', 'traps', 'upper back'],
      legs: ['quads', 'quadriceps', 'hamstrings', 'glutes', 'calves'],
      shoulders: ['delts', 'deltoids', 'shoulders'],
      arms: ['biceps', 'triceps', 'forearms'],
      core: ['abs', 'abdominals', 'core', 'obliques'],
    };

    const selectedExercises = [];
    
    // Seleccionar 15 ejercicios por grupo muscular
    for (const [group, muscles] of Object.entries(targetGroups)) {
      const groupExercises = exercisesData.filter(ex => 
        ex.targetMuscles.some(m => muscles.includes(m.toLowerCase()))
      );
      
      // Tomar 15 ejercicios variados (o todos si hay menos de 15)
      const selected = groupExercises.slice(0, 15);
      selectedExercises.push(...selected);
      console.log(`✓ Grupo ${group}: ${selected.length} ejercicios`);
    }

    console.log(`\n✅ Seleccionados ${selectedExercises.length} ejercicios balanceados`);
    
    // Distribuir por grupo muscular
    const distribution = {};
    for (const [group, muscles] of Object.entries(targetGroups)) {
      const count = selectedExercises.filter(ex => 
        ex.targetMuscles.some(m => muscles.includes(m.toLowerCase()))
      ).length;
      distribution[group] = count;
    }
    console.log('Distribución por grupo:', distribution);

    // Convertir a formato RPG
    const rpgExercises = selectedExercises.map((ex, index) => {
      const primaryMuscle = ex.targetMuscles[0]?.toLowerCase() || 'unknown';
      const equipment = ex.equipments[0] || 'body weight';
      const difficulty = getDifficultyFromEquipment(equipment);
      
      // Obtener muscleTargets desde el mapeo
      const muscleTargets = muscleToRPG[primaryMuscle] || { STR: 0.5, STA: 0.5 };
      
      // Calcular stats basados en dificultad
      const baseXP = difficulty * 30;
      const fatigueCost = difficulty * 4;
      const executionTime = 2 + (difficulty * 0.3);

      return {
        externalId: ex.exerciseId,
        levelRequired: difficulty,
        baseXP,
        fatigueCost,
        executionTime,
        muscleTargets,
        prerequisites: [], // Sin prerequisites para permitir todos
        unlocks: [],
      };
    });

    // Limpiar colección existente
    await collection.deleteMany({});
    console.log('\n🗑️  Colección limpiada');

    // Insertar ejercicios
    const result = await collection.insertMany(rpgExercises);
    console.log(`✅ Insertados ${result.insertedCount} ejercicios en la base de datos`);

    // Mostrar distribución por nivel
    const levelDistribution = {};
    for (const ex of rpgExercises) {
      levelDistribution[ex.levelRequired] = (levelDistribution[ex.levelRequired] || 0) + 1;
    }
    console.log('Por nivel:', levelDistribution);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔒 Conexión cerrada');
  }
}

seedExercises();
