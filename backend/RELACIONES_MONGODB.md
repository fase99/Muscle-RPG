# Relaciones MongoDB entre Users y Profiles

## Descripción General

Se ha implementado una **relación bidireccional** entre las colecciones `users` y `profiles` utilizando ObjectId de MongoDB. Esto permite mantener la integridad referencial y realizar consultas eficientes con población de datos.

## Estructura de las Relaciones

### 1. Schema User (users collection)

```typescript
@Schema({ timestamps: true })
export class User {
  // ... campos existentes ...
  
  // RELACIÓN CON PROFILE
  @Prop({ type: Types.ObjectId, ref: 'Profile' })
  profileId?: Types.ObjectId; // Referencia al perfil de perfilamiento
}
```

**Campo agregado:**
- `profileId`: ObjectId opcional que apunta al documento de Profile asociado

### 2. Schema Profile (profiles collection)

```typescript
@Schema({ timestamps: true })
export class Profile {
  // RELACIÓN CON USER
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // Referencia al usuario propietario
  
  // ... resto de campos ...
}
```

**Campo agregado:**
- `userId`: ObjectId requerido que apunta al documento de User propietario

## Tipo de Relación

**Relación 1:1 (Uno a Uno)**
- Un `User` puede tener **máximo un** `Profile`
- Un `Profile` pertenece a **exactamente un** `User`

### Diagrama de Relación

```
┌─────────────────┐          profileId           ┌─────────────────┐
│                 │◄──────────────────────────────│                 │
│      USER       │                               │     PROFILE     │
│   (users)       │                               │   (profiles)    │
│                 │──────────────────────────────►│                 │
└─────────────────┘          userId               └─────────────────┘
```

## Flujo de Creación de Perfil

### Escenario 1: Usuario Crea su Perfil

```typescript
// Frontend envía POST /users/profile
{
  "userId": "507f1f77bcf86cd799439011",  // ObjectId del usuario
  "age": 25,
  "gender": 1,
  "experienceMonths": 12,
  // ... resto de datos
}

// Backend:
// 1. Crea el Profile con userId
const profile = await profileModel.create({
  userId: "507f1f77bcf86cd799439011",
  // ... datos calculados
});

// 2. Actualiza el User con profileId
await userModel.findByIdAndUpdate(
  "507f1f77bcf86cd799439011",
  { profileId: profile._id }
);
```

### Escenario 2: Perfil sin Usuario (Opcional)

Si no se proporciona `userId`, el perfil se crea sin relación:

```typescript
// Sin userId en el DTO
{
  "age": 25,
  "gender": 1,
  // ...
}

// Se crea el Profile pero no se actualiza ningún User
```

## Endpoints Disponibles

### Endpoints de Usuario

#### 1. GET `/users/:id/with-profile`
Obtiene un usuario con su perfil poblado (populate).

**Request:**
```http
GET /users/507f1f77bcf86cd799439011/with-profile
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@example.com",
  "nivel": 1,
  "experiencia": 0,
  "profileId": {
    "_id": "507f191e810c19729de860ea",
    "userId": "507f1f77bcf86cd799439011",
    "level": "Intermedio",
    "sRpg": 45.5,
    "estimatedBodyFat": 18.2,
    // ... todos los campos del perfil
  }
}
```

#### 2. GET `/users/:id/profile`
Obtiene solo el perfil asociado al usuario.

**Request:**
```http
GET /users/507f1f77bcf86cd799439011/profile
```

**Response:**
```json
{
  "_id": "507f191e810c19729de860ea",
  "userId": "507f1f77bcf86cd799439011",
  "age": 25,
  "gender": 1,
  "level": "Intermedio",
  "sRpg": 45.5,
  "estimatedBodyFat": 18.2,
  // ... resto de campos
}
```

**Si no tiene perfil:**
```json
{
  "message": "Este usuario no tiene un perfil de perfilamiento creado",
  "hasProfile": false
}
```

#### 3. GET `/users/:id/has-profile`
Verifica si un usuario tiene perfil creado.

**Response:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "hasProfile": true
}
```

### Endpoints de Perfiles

#### 4. GET `/users/profiles/stats`
Obtiene estadísticas globales de perfiles.

**Response:**
```json
{
  "total": 150,
  "porNivel": {
    "basico": 60,
    "intermedio": 70,
    "avanzado": 20
  },
  "porcentajes": {
    "basico": "40.00",
    "intermedio": "46.67",
    "avanzado": "13.33"
  }
}
```

#### 5. GET `/users/profiles/level/:level`
Obtiene todos los perfiles de un nivel específico.

**Request:**
```http
GET /users/profiles/level/Intermedio
```

**Response:**
```json
[
  {
    "_id": "507f191e810c19729de860ea",
    "userId": "507f1f77bcf86cd799439011",
    "level": "Intermedio",
    "sRpg": 45.5,
    // ... resto de campos
  },
  // ... más perfiles
]
```

## Métodos del Servicio

### UsersService

#### `findOneWithProfile(userId: string)`
Obtiene un usuario con su perfil poblado usando `.populate()`.

#### `getProfileByUserId(userId: string)`
Busca el perfil asociado a un usuario específico.

#### `hasProfile(userId: string)`
Verifica la existencia de un perfil para el usuario.

#### `linkProfileToUser(userId: string, profileId: string)`
Actualiza manualmente la referencia `profileId` en el usuario.

### ProfilingService

#### `getProfileWithUser(profileId: string)`
Obtiene un perfil con el usuario asociado poblado.

#### `getProfilesByLevel(level: string)`
Filtra perfiles por nivel (Básico/Intermedio/Avanzado).

#### `getProfileStats()`
Calcula estadísticas agregadas de todos los perfiles.

## Consultas con Populate

### Populate desde User a Profile

```typescript
const user = await userModel
  .findById(userId)
  .populate('profileId')
  .exec();

// user.profileId contendrá el documento completo de Profile
```

### Populate desde Profile a User

```typescript
const profile = await profileModel
  .findById(profileId)
  .populate('userId', '-password') // Sin el password
  .exec();

// profile.userId contendrá el documento de User
```

## Índices Recomendados

Para optimizar las consultas, se recomienda crear índices:

```javascript
// En User
UserSchema.index({ profileId: 1 });

// En Profile
ProfileSchema.index({ userId: 1 });
ProfileSchema.index({ level: 1 });
```

## Integridad Referencial

### Consideraciones Importantes

1. **Eliminación de Usuario:**
   - Actualmente se hace "soft delete" (activo: false)
   - El perfil asociado permanece en la BD
   - Considerar eliminar o desactivar el perfil también

2. **Eliminación de Perfil:**
   - No hay endpoint de eliminación implementado
   - Si se elimina manualmente, actualizar `user.profileId = null`

3. **Actualización de Perfil:**
   - El perfil es inmutable después de creado
   - Para recalcular, crear un nuevo perfil o implementar update

## Migración de Datos Existentes

Si tienes datos existentes sin relaciones:

### Script de Migración (conceptual)

```typescript
// Vincular perfiles existentes a usuarios por email
async function migrateProfiles() {
  const profiles = await profileModel.find();
  
  for (const profile of profiles) {
    // Si tienes alguna forma de identificar al usuario
    // por ejemplo, por email o edad
    const user = await userModel.findOne({ 
      edad: profile.age 
    });
    
    if (user && !profile.userId) {
      profile.userId = user._id;
      await profile.save();
      
      user.profileId = profile._id;
      await user.save();
    }
  }
}
```

## Ejemplo de Uso en Frontend

### Crear Perfil para Usuario Autenticado

```typescript
// Después del login, obtener userId
const userId = currentUser._id;

// Crear perfil
const profileData = {
  userId: userId,
  age: 25,
  gender: 1,
  experienceMonths: 12,
  weight: 75,
  height: 1.75,
  nivelactividad: 'active',
  condicionmedica: false
};

const response = await fetch('http://localhost:3000/users/profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(profileData)
});

const result = await response.json();
// result incluye profileId y userId
```

### Verificar si Usuario Tiene Perfil

```typescript
const checkProfile = async (userId: string) => {
  const response = await fetch(`http://localhost:3000/users/${userId}/has-profile`);
  const { hasProfile } = await response.json();
  
  if (!hasProfile) {
    // Redirigir a /setup
  } else {
    // Continuar a /rutina
  }
};
```

### Obtener Usuario con Perfil Completo

```typescript
const getUserData = async (userId: string) => {
  const response = await fetch(`http://localhost:3000/users/${userId}/with-profile`);
  const userData = await response.json();
  
  console.log('Usuario:', userData.nombre);
  console.log('Nivel RPG:', userData.profileId?.level);
  console.log('Score:', userData.profileId?.sRpg);
};
```

## Ventajas de Esta Implementación

1. ✅ **Integridad Referencial:** Las relaciones se mantienen mediante ObjectId
2. ✅ **Población Eficiente:** Uso de `.populate()` para joins
3. ✅ **Bidireccionalidad:** Navegación desde User a Profile y viceversa
4. ✅ **Flexibilidad:** El userId es opcional en CreateProfileDto
5. ✅ **Queries Optimizadas:** Índices en campos de relación
6. ✅ **Estadísticas:** Fácil agregación de datos por nivel

## Próximos Pasos Sugeridos

- [ ] Implementar endpoints de actualización de perfil
- [ ] Crear middleware para validar que el usuario tenga perfil
- [ ] Agregar cascada de eliminación (eliminar perfil si se elimina usuario)
- [ ] Implementar versionado de perfiles (histórico de cambios)
- [ ] Agregar validación: un usuario no puede tener más de un perfil
- [ ] Crear índices compuestos para queries complejas

---

**Actualizado:** Diciembre 11, 2025  
**Versión:** 1.0 - Relaciones Bidireccionales User-Profile
