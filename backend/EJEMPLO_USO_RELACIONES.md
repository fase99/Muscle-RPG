# Ejemplo de Uso: Relaciones User-Profile

## Flujo Completo de Creación y Consulta

### 1. Registrar un Nuevo Usuario

```bash
POST http://localhost:3000/users
Content-Type: application/json

{
  "nombre": "Carlos",
  "apellido": "Martínez",
  "edad": 28,
  "email": "carlos@example.com",
  "password": "mipassword123"
}
```

**Response:**
```json
{
  "_id": "67534abc12345678901234ef",
  "nombre": "Carlos",
  "apellido": "Martínez",
  "edad": 28,
  "email": "carlos@example.com",
  "nivel": 1,
  "experiencia": 0,
  "staminaActual": 100,
  "staminaMaxima": 100,
  "atributos": {
    "STR": 50,
    "AGI": 50,
    "STA": 50,
    "INT": 50,
    "DEX": 50,
    "END": 50
  },
  "activo": true,
  "createdAt": "2025-12-11T00:00:00.000Z"
}
```

### 2. Crear Perfil de Perfilamiento (vinculado al usuario)

```bash
POST http://localhost:3000/users/profile
Content-Type: application/json

{
  "userId": "67534abc12345678901234ef",
  "age": 28,
  "gender": 1,
  "experienceMonths": 18,
  "weight": 80,
  "height": 1.78,
  "nivelactividad": "active",
  "condicionmedica": false,
  "pliegue_triceps": 11,
  "pliegue_deltoides": 9,
  "pliegue_pectoral": 7,
  "pliegue_cintura": 14,
  "pliegue_gluteo": 12,
  "pliegue_cuadriceps": 15,
  "pliegue_gastronemio": 10
}
```

**Response:**
```json
{
  "sRpg": 50.4,
  "level": "Intermedio",
  "estimatedBodyFat": 16.3,
  "compositionMultiplier": 1.1,
  "metodoCalculoPGC": "7 Pliegues (Gold Standard)",
  "puntajeExperiencia": 30,
  "puntajeActividad": 10,
  "factorSeguridad": 1,
  "frecuenciaSemanal": { "min": 3, "max": 4 },
  "rirTarget": { "min": 2, "max": 2 },
  "cargaEstimada": { "min": 75, "max": 80 },
  "profileId": "67534def98765432109876ba",
  "userId": "67534abc12345678901234ef"
}
```

### 3. Obtener Usuario con Perfil Completo

```bash
GET http://localhost:3000/users/67534abc12345678901234ef/with-profile
```

**Response:**
```json
{
  "_id": "67534abc12345678901234ef",
  "nombre": "Carlos",
  "apellido": "Martínez",
  "edad": 28,
  "email": "carlos@example.com",
  "nivel": 1,
  "experiencia": 0,
  "profileId": {
    "_id": "67534def98765432109876ba",
    "userId": "67534abc12345678901234ef",
    "age": 28,
    "gender": 1,
    "experienceMonths": 18,
    "weight": 80,
    "height": 1.78,
    "nivelactividad": "active",
    "condicionmedica": false,
    "pliegues": {
      "triceps": 11,
      "deltoides": 9,
      "pectoral": 7,
      "cintura": 14,
      "gluteo": 12,
      "cuadriceps": 15,
      "gastronemio": 10
    },
    "sRpg": 50.4,
    "level": "Intermedio",
    "estimatedBodyFat": 16.3,
    "compositionMultiplier": 1.1,
    "metodoCalculoPGC": "7 Pliegues (Gold Standard)",
    "puntajeExperiencia": 30,
    "puntajeActividad": 10,
    "factorSeguridad": 1,
    "frecuenciaSemanal": { "min": 3, "max": 4 },
    "rirTarget": { "min": 2, "max": 2 },
    "cargaEstimada": { "min": 75, "max": 80 },
    "createdAt": "2025-12-11T00:05:00.000Z",
    "updatedAt": "2025-12-11T00:05:00.000Z"
  },
  "atributos": { "STR": 50, "AGI": 50, "STA": 50, "INT": 50, "DEX": 50, "END": 50 },
  "staminaActual": 100,
  "staminaMaxima": 100,
  "activo": true
}
```

### 4. Verificar si el Usuario Tiene Perfil

```bash
GET http://localhost:3000/users/67534abc12345678901234ef/has-profile
```

**Response:**
```json
{
  "userId": "67534abc12345678901234ef",
  "hasProfile": true
}
```

### 5. Obtener Solo el Perfil del Usuario

```bash
GET http://localhost:3000/users/67534abc12345678901234ef/profile
```

**Response:**
```json
{
  "_id": "67534def98765432109876ba",
  "userId": "67534abc12345678901234ef",
  "age": 28,
  "gender": 1,
  "level": "Intermedio",
  "sRpg": 50.4,
  "estimatedBodyFat": 16.3,
  "compositionMultiplier": 1.1,
  "metodoCalculoPGC": "7 Pliegues (Gold Standard)",
  "frecuenciaSemanal": { "min": 3, "max": 4 },
  "rirTarget": { "min": 2, "max": 2 },
  "cargaEstimada": { "min": 75, "max": 80 }
}
```

### 6. Obtener Estadísticas Globales de Perfiles

```bash
GET http://localhost:3000/users/profiles/stats
```

**Response:**
```json
{
  "total": 25,
  "porNivel": {
    "basico": 8,
    "intermedio": 12,
    "avanzado": 5
  },
  "porcentajes": {
    "basico": "32.00",
    "intermedio": "48.00",
    "avanzado": "20.00"
  }
}
```

### 7. Obtener Todos los Usuarios de Nivel Intermedio

```bash
GET http://localhost:3000/users/profiles/level/Intermedio
```

**Response:**
```json
[
  {
    "_id": "67534def98765432109876ba",
    "userId": "67534abc12345678901234ef",
    "level": "Intermedio",
    "sRpg": 50.4,
    "estimatedBodyFat": 16.3
  },
  {
    "_id": "67534def98765432109876bb",
    "userId": "67534abc12345678901234f0",
    "level": "Intermedio",
    "sRpg": 48.2,
    "estimatedBodyFat": 19.1
  }
  // ... más perfiles
]
```

## Casos de Uso en Frontend

### Caso 1: Login y Verificación de Perfil

```typescript
// login.component.ts
async onLogin(credentials: { email: string, password: string }) {
  const loginResponse = await this.authService.login(credentials);
  const userId = loginResponse.user._id;
  
  // Verificar si tiene perfil
  const { hasProfile } = await this.http.get(
    `${API_URL}/users/${userId}/has-profile`
  ).toPromise();
  
  if (!hasProfile) {
    // Redirigir a crear perfil
    this.router.navigate(['/setup'], { 
      queryParams: { userId } 
    });
  } else {
    // Ya tiene perfil, ir a dashboard
    this.router.navigate(['/dashboard']);
  }
}
```

### Caso 2: Crear Perfil desde Setup

```typescript
// setup.component.ts
async onSubmit() {
  // Obtener userId del usuario autenticado
  const userId = this.authService.getCurrentUserId();
  
  const profileData = {
    userId: userId,
    ...this.profileForm.value
  };
  
  const result = await this.http.post(
    `${API_URL}/users/profile`,
    profileData
  ).toPromise();
  
  console.log('Perfil creado:', result);
  
  // Mostrar resultados
  this.result = result;
}
```

### Caso 3: Dashboard con Datos Completos

```typescript
// dashboard.component.ts
async ngOnInit() {
  const userId = this.authService.getCurrentUserId();
  
  // Obtener usuario con perfil en una sola llamada
  const userData = await this.http.get(
    `${API_URL}/users/${userId}/with-profile`
  ).toPromise();
  
  // Datos del usuario RPG
  this.userName = userData.nombre;
  this.level = userData.nivel;
  this.experience = userData.experiencia;
  this.stamina = userData.staminaActual;
  
  // Datos del perfil de perfilamiento
  if (userData.profileId) {
    this.userClass = userData.profileId.level; // Básico/Intermedio/Avanzado
    this.scoreRPG = userData.profileId.sRpg;
    this.bodyFat = userData.profileId.estimatedBodyFat;
    this.trainingFrequency = userData.profileId.frecuenciaSemanal;
    this.rirTarget = userData.profileId.rirTarget;
  }
}
```

### Caso 4: Validación de Perfil en Guard

```typescript
// profile.guard.ts
@Injectable()
export class ProfileGuard implements CanActivate {
  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}
  
  async canActivate(): Promise<boolean> {
    const userId = this.authService.getCurrentUserId();
    
    if (!userId) {
      this.router.navigate(['/login']);
      return false;
    }
    
    const { hasProfile } = await this.http.get(
      `${API_URL}/users/${userId}/has-profile`
    ).toPromise();
    
    if (!hasProfile) {
      this.router.navigate(['/setup']);
      return false;
    }
    
    return true;
  }
}
```

## Consultas Avanzadas con MongoDB

### Encontrar Usuarios Avanzados con Bajo % de Grasa

```typescript
// En el backend, crear un nuevo método
async findAdvancedLeanUsers() {
  return this.profileModel.aggregate([
    {
      $match: {
        level: 'Avanzado',
        estimatedBodyFat: { $lt: 15 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        userName: { $concat: ['$user.nombre', ' ', '$user.apellido'] },
        email: '$user.email',
        level: 1,
        sRpg: 1,
        estimatedBodyFat: 1,
        compositionMultiplier: 1
      }
    },
    {
      $sort: { sRpg: -1 }
    }
  ]).exec();
}
```

### Ranking de Usuarios por Score RPG

```typescript
async getUserRanking(limit: number = 10) {
  return this.profileModel.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $sort: { sRpg: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        rank: 1,
        userName: { $concat: ['$user.nombre', ' ', '$user.apellido'] },
        level: 1,
        sRpg: 1,
        estimatedBodyFat: 1
      }
    }
  ]).exec();
}
```

## Verificación en MongoDB Compass

### Ver la relación en la BD:

1. **Colección Users:**
```json
{
  "_id": ObjectId("67534abc12345678901234ef"),
  "nombre": "Carlos",
  "email": "carlos@example.com",
  "profileId": ObjectId("67534def98765432109876ba")
}
```

2. **Colección Profiles:**
```json
{
  "_id": ObjectId("67534def98765432109876ba"),
  "userId": ObjectId("67534abc12345678901234ef"),
  "level": "Intermedio",
  "sRpg": 50.4
}
```

### Query Manual con Lookup:

```javascript
db.users.aggregate([
  {
    $lookup: {
      from: "profiles",
      localField: "profileId",
      foreignField: "_id",
      as: "profile"
    }
  }
])
```

---

**Nota:** Todos estos endpoints asumen que el backend está corriendo en `http://localhost:3000`
