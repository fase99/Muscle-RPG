import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface ExerciseDbExercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

@Injectable()
export class ExerciseDbService {
  private readonly logger = new Logger(ExerciseDbService.name);
  private readonly apiUrl = 'https://exercisedb.p.rapidapi.com';
  private cachedExercises: ExerciseDbExercise[] | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hora

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private getHeaders() {
    const apiKey = this.configService.get<string>('EXERCISEDB_API_KEY');
    if (!apiKey) {
      this.logger.warn('EXERCISEDB_API_KEY no está configurada. Usando datos mock.');
    }
    
    return {
      'X-RapidAPI-Key': apiKey || 'DEMO_KEY',
      'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
    };
  }

  /**
   * Obtiene todos los ejercicios del archivo local data-exercises/exercises.json
   */
  private async getAllExercises(): Promise<ExerciseDbExercise[]> {
    // Verificar caché
    const now = Date.now();
    if (this.cachedExercises && this.cacheTimestamp && (now - this.cacheTimestamp < this.CACHE_DURATION)) {
      this.logger.log('Usando ejercicios cacheados');
      return this.cachedExercises || [];
    }

    try {
      // Intentar cargar desde archivo local primero
      const dataPath = path.join(__dirname, '..', '..', 'data-exercises', 'exercises.json');
      
      if (fs.existsSync(dataPath)) {
        this.logger.log(`Cargando ejercicios desde archivo local: ${dataPath}`);
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        this.cachedExercises = JSON.parse(fileContent);
        this.cacheTimestamp = now;
        
        if (this.cachedExercises) {
          this.logger.log(`✅ ${this.cachedExercises.length} ejercicios cargados desde archivo local`);
        }
        
        return this.cachedExercises || [];
      }
      
      // Fallback a API si no hay archivo local
      this.logger.warn('Archivo local no encontrado, intentando con API...');
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/exercises`, {
          headers: this.getHeaders(),
          params: { limit: 1000 }
        })
      );

      this.cachedExercises = response.data;
      this.cacheTimestamp = now;
      if (this.cachedExercises) {
        this.logger.log(`${this.cachedExercises.length} ejercicios cargados de la API`);
      }
      
      return this.cachedExercises || [];
    } catch (error) {
      this.logger.error('Error al obtener ejercicios', error);
      return this.getMockExercises();
    }
  }

  /**
   * Traer detalles de ejercicios por lista de IDs
   */
  async getExercisesByIds(ids: string[]): Promise<ExerciseDbExercise[]> {
    const allExercises = await this.getAllExercises();
    
    // Filtrar solo los que necesitamos
    return allExercises.filter(ex => ids.includes(ex.exerciseId));
  }

  /**
   * Obtener un ejercicio por ID específico
   */
  async getExerciseById(id: string): Promise<ExerciseDbExercise | null> {
    const allExercises = await this.getAllExercises();
    return allExercises.find(ex => ex.exerciseId === id) || null;
  }

  /**
   * Obtener el nombre de un ejercicio por su ID
   */
  async getExerciseName(id: string): Promise<string> {
    const exercise = await this.getExerciseById(id);
    return exercise?.name || `Exercise ${id}`;
  }

  /**
   * Obtener ejercicios que trabajan un grupo muscular específico
   */
  async getExercisesByMuscleGroup(muscleGroup: string): Promise<ExerciseDbExercise[]> {
    const allExercises = await this.getAllExercises();
    
    // Normalizar el nombre del grupo muscular
    const normalizedGroup = muscleGroup.toLowerCase();
    
    // Mapeo de grupos musculares a términos de búsqueda
    const muscleTerms: Record<string, string[]> = {
      chest: ['chest', 'pectorals'],
      back: ['back', 'lats', 'latissimus', 'traps', 'trapezius'],
      shoulders: ['shoulders', 'delts', 'deltoids'],
      arms: ['biceps', 'triceps', 'forearms'],
      biceps: ['biceps'],
      triceps: ['triceps'],
      legs: ['quads', 'quadriceps', 'hamstrings', 'glutes', 'calves'],
      core: ['abs', 'abdominals', 'core'],
    };
    
    const searchTerms = muscleTerms[normalizedGroup] || [normalizedGroup];
    
    return allExercises.filter(ex => {
      const targets = ex.targetMuscles.map(m => m.toLowerCase());
      const secondaries = (ex.secondaryMuscles || []).map(m => m.toLowerCase());
      const allMuscles = [...targets, ...secondaries];
      
      return searchTerms.some(term => 
        allMuscles.some(muscle => muscle.includes(term))
      );
    });
  }

  /**
   * Datos mock para desarrollo/testing cuando la API no está disponible
   */
  private getMockExercises(): ExerciseDbExercise[] {
    return [
      {
        exerciseId: '0001',
        name: '3/4 sit-up',
        gifUrl: 'https://api.exercisedb.io/image/N7i5CNgRhfmJv5',
        targetMuscles: ['abs'],
        equipments: ['body weight'],
        bodyParts: ['waist'],
        secondaryMuscles: ['hip flexors'],
        instructions: ['Lie on your back with your knees bent...']
      },
      {
        exerciseId: '0002',
        name: 'assisted pull-up',
        gifUrl: 'https://api.exercisedb.io/image/UU1PrBxww90sxq',
        targetMuscles: ['lats'],
        equipments: ['assisted'],
        bodyParts: ['back'],
        secondaryMuscles: ['biceps', 'shoulders'],
        instructions: ['Grab the pull-up bar with an overhand grip...']
      },
      {
        exerciseId: '0003',
        name: 'barbell bench press',
        gifUrl: 'https://api.exercisedb.io/image/H3-vGUBHHHf4LW',
        targetMuscles: ['pectorals'],
        equipments: ['barbell'],
        bodyParts: ['chest'],
        secondaryMuscles: ['triceps', 'shoulders'],
        instructions: ['Lie on a flat bench...']
      }
    ];
  }

  /**
   * Invalidar caché manualmente (útil para testing o actualizaciones)
   */
  clearCache(): void {
    this.cachedExercises = null;
    this.cacheTimestamp = null;
    this.logger.log('Caché de ejercicios invalidado');
  }
}
