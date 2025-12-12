const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://admin:GvZvmpJM504OknCU@cluster0.vlz4jqr.mongodb.net/?retryWrites=true&w=majority";

async function checkExercises() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🔗 Conectado a MongoDB');
    
    const db = client.db('muscleRPG');
    const collection = db.collection('rpg_exercise_rules');
    
    const count = await collection.countDocuments();
    console.log(`\n📊 Total ejercicios en BD: ${count}\n`);
    
    if (count > 0) {
      const sample = await collection.find({}).limit(5).toArray();
      console.log('📋 Muestra de ejercicios:');
      sample.forEach((ex, i) => {
        console.log(`\n${i+1}. ID: ${ex.externalId}`);
        console.log(`   Nivel: ${ex.levelRequired}`);
        console.log(`   Prerequisites: ${ex.prerequisites?.length || 0}`);
        console.log(`   XP: ${ex.baseXP}, Fatiga: ${ex.fatigueCost}, Tiempo: ${ex.executionTime}min`);
      });
      
      // Ver distribución por nivel
      const byLevel = await collection.aggregate([
        { $group: { _id: '$levelRequired', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      console.log('\n📈 Distribución por nivel:');
      byLevel.forEach(level => {
        console.log(`   Nivel ${level._id}: ${level.count} ejercicios`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔒 Conexión cerrada');
  }
}

checkExercises();
