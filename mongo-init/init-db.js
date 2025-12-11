db = db.getSiblingDB('muscleRPG');

// Índices para mejorar rendimiento
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "nivel": 1 });
db.rutinas.createIndex({ "usuarioId": 1 });
db.rutinas.createIndex({ "activa": 1 });

print('✅ Base de datos muscleRPG inicializada correctamente');
print('✅ Índices creados para optimizar consultas');
    