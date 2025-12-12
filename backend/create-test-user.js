const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://admin:GvZvmpJM504OknCU@cluster0.vlz4jqr.mongodb.net/?retryWrites=true&w=majority';

async function createTestUser() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('🔗 Conectado a MongoDB');

    const db = client.db('muscleRPG');
    const usersCollection = db.collection('users');
    const profilesCollection = db.collection('profiles');

    // Verificar si ya existe el usuario
    const existing = await usersCollection.findOne({ email: 'test@test.com' });
    if (existing) {
      console.log('⚠️  Usuario test@test.com ya existe');
      console.log(`   ID: ${existing._id}`);
      console.log(`   Stamina: ${existing.staminaActual}/${existing.staminaMaxima}`);
      return;
    }

    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const newUser = {
      nombre: 'Felipe',
      email: 'test@test.com',
      password: hashedPassword,
      nivel: 35, // Nivel para que sea "Intermedio"
      xpActual: 8500,
      xpSiguienteNivel: 12600,
      staminaActual: 100,
      staminaMaxima: 100,
      monedas: 0,
      logros: [],
      ejerciciosCompletados: [],
      historialSesiones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userResult = await usersCollection.insertOne(newUser);
    console.log('✅ Usuario creado:', userResult.insertedId.toString());

    // Crear perfil para el usuario
    const newProfile = {
      userId: userResult.insertedId.toString(),
      age: 25,
      gender: 'male',
      weight: 75,
      height: 175,
      level: 'Intermedio',
      goal: 'muscle_gain',
      trainingFrequency: 4,
      availableTime: 90,
      exerciseExperience: 'intermediate',
      equipmentAvailable: ['barbell', 'dumbbell', 'body_weight'],
      injuries: [],
      preferences: {
        preferredMuscleGroups: [],
        avoidedExercises: []
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const profileResult = await profilesCollection.insertOne(newProfile);
    console.log('✅ Perfil creado:', profileResult.insertedId.toString());

    console.log('\n📋 Usuario de prueba:');
    console.log('   Email: test@test.com');
    console.log('   Password: password123');
    console.log('   Nivel: 35 (Intermedio)');
    console.log('   Stamina: 100/100');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔒 Conexión cerrada');
  }
}

createTestUser();
