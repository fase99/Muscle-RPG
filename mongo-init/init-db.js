db = db.getSiblingDB('muscle_rpg');

// Índices para mejorar rendimiento
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "nivel": 1 });
db.rutinas.createIndex({ "usuarioId": 1 });
db.rutinas.createIndex({ "activa": 1 });

print('✅ Base de datos muscle_rpg inicializada correctamente');
print('✅ Índices creados para optimizar consultas');
    