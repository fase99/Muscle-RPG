import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface ExerciseDbExercise {
  id: string;
  name: string;
  gifUrl: string;
  target: string; // Músculo objetivo
  equipment: string;
  bodyPart: string;
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
   * Obtiene todos los ejercicios de la API (con caché)
   */
  private async getAllExercises(): Promise<ExerciseDbExercise[]> {
    // Verificar caché
    const now = Date.now();
    if (this.cachedExercises && this.cacheTimestamp && (now - this.cacheTimestamp < this.CACHE_DURATION)) {
      this.logger.log('Usando ejercicios cacheados');
      return this.cachedExercises || [];
    }

    try {
      this.logger.log('Obteniendo ejercicios de ExerciseDB API...');
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/exercises`, {
          headers: this.getHeaders(),
          params: { limit: 1000 } // Ajusta según tus necesidades
        })
      );

      this.cachedExercises = response.data;
      this.cacheTimestamp = now;
      if (this.cachedExercises) {
        this.logger.log(`${this.cachedExercises.length} ejercicios cargados de la API`);
      }
      
      return this.cachedExercises || [];
    } catch (error) {
      this.logger.error('Error al obtener ejercicios de ExerciseDB API', error);
      
      // Fallback: retornar datos mock si la API falla
      return this.getMockExercises();
    }
  }

  /**
   * Traer detalles de ejercicios por lista de IDs
   */
  async getExercisesByIds(ids: string[]): Promise<ExerciseDbExercise[]> {
    const allExercises = await this.getAllExercises();
    
    // Filtrar solo los que necesitamos
    return allExercises.filter(ex => ids.includes(ex.id));
  }

  /**
   * Obtener un ejercicio por ID específico
   */
  async getExerciseById(id: string): Promise<ExerciseDbExercise | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/exercises/exercise/${id}`, {
          headers: this.getHeaders()
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error al obtener ejercicio ${id}`, error);
      
      // Buscar en caché como fallback
      const allExercises = await this.getAllExercises();
      return allExercises.find(ex => ex.id === id) || null;
    }
  }

  /**
   * Datos mock para desarrollo/testing cuando la API no está disponible
   */
  private getMockExercises(): ExerciseDbExercise[] {
    return [
      {
        id: '0001',
        name: '3/4 sit-up',
        gifUrl: 'https://api.exercisedb.io/image/N7i5CNgRhfmJv5',
        target: 'abs',
        equipment: 'body weight',
        bodyPart: 'waist',
        secondaryMuscles: ['hip flexors'],
        instructions: ['Lie on your back with your knees bent...']
      },
      {
        id: '0002',
        name: 'assisted pull-up',
        gifUrl: 'https://api.exercisedb.io/image/UU1PrBxww90sxq',
        target: 'lats',
        equipment: 'assisted',
        bodyPart: 'back',
        secondaryMuscles: ['biceps', 'shoulders'],
        instructions: ['Grab the pull-up bar with an overhand grip...']
      },
      {
        id: '0003',
        name: 'barbell bench press',
        gifUrl: 'https://api.exercisedb.io/image/H3-vGUBHHHf4LW',
        target: 'pectorals',
        equipment: 'barbell',
        bodyPart: 'chest',
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
