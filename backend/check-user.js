const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://admin:GvZvmpJM504OknCU@cluster0.vlz4jqr.mongodb.net/?retryWrites=true&w=majority';

async function checkUser() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('🔗 Conectado a MongoDB');

    const db = client.db('muscleRPG');
    const usersCollection = db.collection('users');
    const profilesCollection = db.collection('profiles');

    // Contar usuarios
    const userCount = await usersCollection.countDocuments();
    console.log(`\n📊 Total usuarios: ${userCount}`);

    if (userCount > 0) {
      // Obtener un usuario de muestra
      const sampleUser = await usersCollection.findOne();
      console.log('\n👤 Usuario de muestra:');
      console.log(`   Nombre: ${sampleUser.nombre}`);
      console.log(`   Email: ${sampleUser.email}`);
      console.log(`   Nivel: ${sampleUser.nivel}`);
      console.log(`   Stamina: ${sampleUser.staminaActual}/${sampleUser.staminaMaxima}`);
      console.log(`   ID: ${sampleUser._id}`);

      // Buscar perfil del usuario
      const profile = await profilesCollection.findOne({ userId: sampleUser._id.toString() });
      if (profile) {
        console.log('\n📋 Perfil encontrado:');
        console.log(`   Level: ${profile.level}`);
        console.log(`   Goal: ${profile.goal}`);
      } else {
        console.log('\n⚠️  No se encontró perfil para este usuario');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔒 Conexión cerrada');
  }
}

checkUser();
