import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Ejercicio {
  nombre: string;
  externalId?: string;
  series: number;
  repeticiones: number;
  sets?: number;  // alias para series
  reps?: string;  // alias para repeticiones
  peso?: number;
  intensidad?: number;
  tiempo: number;     // minutos (incluye descansos entre series)
  costoTiempo?: number;
  costoFatiga?: number;
  estimuloXP?: number;
  energia: number;
  rir?: number;
  hecho: boolean;
  completado?: boolean;
  notas?: string;
  targetMuscles?: string[];
  bodyParts?: string[];
}

export interface Rutina {
  _id?: string;
  dia: string;
  nombre?: string;
  descripcion?: string;
  tiempoPlaneado: number;  // siempre 120
  tiempoTotal?: number;
  energiaMax: number;
  fatigaTotal?: number;
  xpTotalEstimado?: number;
  ejercicios: Ejercicio[];
  volumeLandmarks?: {
    MEV: number;
    MAV: number;
    MRV: number;
  };
  muscleGroups?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RutinaService {
  private baseUrl = 'http://localhost:3000/rutinas';

  constructor(private http: HttpClient) {}

  /**
   * Genera una rutina diaria optimizada desde el backend
   */
  generateDailyRoutine(
    userId: string,
    availableTime: number = 120,
    stamina?: number
  ): Observable<any> {
    return this.http.post(`${this.baseUrl}/generate/daily`, {
      userId,
      availableTimeMinutes: availableTime,
      currentStamina: stamina
    });
  }

  /**
   * Genera una rutina semanal completa (7 días)
   */
  generateWeeklyRoutine(
    userId: string,
    availableTime: number = 120
  ): Observable<any> {
    return this.http.post(`${this.baseUrl}/generate/weekly`, {
      userId,
      availableTimeMinutes: availableTime
    });
  }

  /**
   * Planifica un ciclo trimestral
   */
  planQuarterlyCycle(userId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/plan/quarterly/${userId}`, {});
  }

  /**
   * Obtiene las rutinas del usuario
   */
  getUserRoutines(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/user/${userId}`);
  }

  /**
   * Marca un ejercicio como completado
   */
  markExerciseComplete(
    rutinaId: string,
    exerciseIndex: number,
    completed: boolean
  ): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/${rutinaId}/ejercicio/${exerciseIndex}`,
      { completado: completed }
    );
  }

  /**
   * Marca una rutina como completada
   */
  completeRoutine(rutinaId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${rutinaId}/completar`, {});
  }

  /**
   * Mock de rutina para desarrollo (mantener como fallback)
   */
  obtenerRutinaMock(): Rutina {
    const ejercicios: Ejercicio[] = [
      { nombre: "Sentadilla Libre",           series: 4, sets: 4, reps: "8-10", repeticiones: 10, intensidad: 78, tiempo: 19, energia: 24, hecho: false },
      { nombre: "Prensa 45°",                 series: 4, sets: 4, reps: "10-12", repeticiones: 12, intensidad: 75, tiempo: 17, energia: 20, hecho: false },
      { nombre: "Zancadas con Mancuernas",    series: 3, sets: 3, reps: "12/pierna", repeticiones: 12, intensidad: 68, tiempo: 15, energia: 17, hecho: false },
      { nombre: "Curl Femoral Tumbado",       series: 4, sets: 4, reps: "10-12", repeticiones: 12, intensidad: 62, tiempo: 14, energia: 14, hecho: false },
      { nombre: "Elevaciones de Talones",     series: 4, sets: 4, reps: "15-20", repeticiones: 20, intensidad: 55, tiempo: 11, energia: 10, hecho: false },
      { nombre: "Plancha Isométrica",         series: 3, sets: 3, reps: "45-60s", repeticiones: 1, intensidad: 0,  tiempo: 9,  energia: 8,  hecho: false },
      { nombre: "Crunch en Polea",            series: 3, sets: 3, reps: "15-20", repeticiones: 20, intensidad: 45, tiempo: 8,  energia: 7,  hecho: false }
    ];

    return {
      dia: "Martes – Piernas & Core",
      tiempoPlaneado: 120,
      energiaMax: 100,
      ejercicios
    };
  }
}