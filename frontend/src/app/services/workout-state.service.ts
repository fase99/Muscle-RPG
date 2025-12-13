import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Estado de un ejercicio durante la sesión
 */
export interface ExerciseProgress {
  externalId: string;
  nombre: string;
  series: number;
  repeticiones: number;
  pesoPlaneado: number;
  pesoReal: number;
  rirPlaneado: number;
  rirReal: number;
  completado: boolean;
  notas?: string;
}

/**
 * Estado completo de la sesión de entrenamiento
 */
export interface WorkoutSession {
  userId: string;
  rutinaId?: string;
  ejercicios: ExerciseProgress[];
  tiempoInicio: number; // timestamp
  duracion: number; // minutos
  staminaInicial: number;
  staminaUsada: number;
  activa: boolean;
}

const STORAGE_KEY = 'muscle_rpg_workout_session';

/**
 * Servicio para gestionar el estado de la sesión de entrenamiento
 * Mantiene la persistencia entre navegaciones y recargas de página
 */
@Injectable({
  providedIn: 'root'
})
export class WorkoutStateService {
  
  // Estado reactivo de la sesión actual
  private sessionSubject = new BehaviorSubject<WorkoutSession | null>(null);
  public session$: Observable<WorkoutSession | null> = this.sessionSubject.asObservable();

  constructor() {
    // Restaurar sesión al iniciar el servicio
    this.restoreProgress();
  }

  /**
   * Obtiene el valor actual de la sesión (síncrono)
   */
  getCurrentSession(): WorkoutSession | null {
    return this.sessionSubject.value;
  }

  /**
   * Inicia una nueva sesión de entrenamiento
   */
  startSession(session: Omit<WorkoutSession, 'tiempoInicio' | 'duracion' | 'staminaUsada' | 'activa'>): void {
    const newSession: WorkoutSession = {
      ...session,
      tiempoInicio: Date.now(),
      duracion: 0,
      staminaUsada: 0,
      activa: true,
    };

    this.sessionSubject.next(newSession);
    this.saveProgress();
    console.log('[WorkoutStateService] 🏁 Sesión iniciada:', newSession);
  }

  /**
   * Actualiza el estado de un ejercicio específico
   */
  updateExercise(index: number, updates: Partial<ExerciseProgress>): void {
    const session = this.sessionSubject.value;
    if (!session) {
      console.warn('[WorkoutStateService] ⚠️ No hay sesión activa para actualizar ejercicio');
      return;
    }

    if (index < 0 || index >= session.ejercicios.length) {
      console.warn('[WorkoutStateService] ⚠️ Índice de ejercicio inválido:', index);
      return;
    }

    const updatedEjercicios = [...session.ejercicios];
    updatedEjercicios[index] = { ...updatedEjercicios[index], ...updates };

    const updatedSession: WorkoutSession = {
      ...session,
      ejercicios: updatedEjercicios,
    };

    this.sessionSubject.next(updatedSession);
    this.saveProgress();
    console.log('[WorkoutStateService] 📝 Ejercicio actualizado:', index, updates);
  }

  /**
   * Marca un ejercicio como completado
   */
  completeExercise(index: number, pesoReal: number, rirReal: number, notas?: string): void {
    this.updateExercise(index, {
      completado: true,
      pesoReal,
      rirReal,
      notas,
    });
  }

  /**
   * Actualiza la duración y stamina usada de la sesión
   */
  updateSessionStats(duracion: number, staminaUsada: number): void {
    const session = this.sessionSubject.value;
    if (!session) return;

    const updatedSession: WorkoutSession = {
      ...session,
      duracion,
      staminaUsada,
    };

    this.sessionSubject.next(updatedSession);
    this.saveProgress();
  }

  /**
   * Finaliza la sesión actual
   */
  endSession(): void {
    const session = this.sessionSubject.value;
    if (!session) return;

    const updatedSession: WorkoutSession = {
      ...session,
      activa: false,
    };

    this.sessionSubject.next(updatedSession);
    this.saveProgress();
    console.log('[WorkoutStateService] 🏁 Sesión finalizada');
  }

  /**
   * Limpia la sesión actual (después de guardar en el backend)
   */
  clearSession(): void {
    this.sessionSubject.next(null);
    localStorage.removeItem(STORAGE_KEY);
    console.log('[WorkoutStateService] 🗑️ Sesión limpiada');
  }

  /**
   * Guarda el progreso actual en localStorage
   */
  saveProgress(): void {
    const session = this.sessionSubject.value;
    if (!session) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    try {
      const serialized = JSON.stringify(session);
      localStorage.setItem(STORAGE_KEY, serialized);
      console.log('[WorkoutStateService] 💾 Progreso guardado en localStorage');
    } catch (error) {
      console.error('[WorkoutStateService] ❌ Error guardando progreso:', error);
    }
  }

  /**
   * Restaura el progreso desde localStorage
   */
  restoreProgress(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        console.log('[WorkoutStateService] ℹ️ No hay sesión guardada para restaurar');
        return;
      }

      const session: WorkoutSession = JSON.parse(stored);
      
      // Validar que la sesión no sea muy antigua (más de 24 horas)
      const horasTranscurridas = (Date.now() - session.tiempoInicio) / (1000 * 60 * 60);
      if (horasTranscurridas > 24) {
        console.log('[WorkoutStateService] ⏰ Sesión muy antigua, descartando');
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      this.sessionSubject.next(session);
      console.log('[WorkoutStateService] 📥 Sesión restaurada desde localStorage:', session);
    } catch (error) {
      console.error('[WorkoutStateService] ❌ Error restaurando progreso:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Obtiene estadísticas de la sesión actual
   */
  getSessionStats(): {
    ejerciciosCompletados: number;
    ejerciciosTotales: number;
    porcentajeCompletado: number;
    volumenLevantado: number;
  } | null {
    const session = this.sessionSubject.value;
    if (!session) return null;

    const ejerciciosCompletados = session.ejercicios.filter(e => e.completado).length;
    const ejerciciosTotales = session.ejercicios.length;
    const porcentajeCompletado = ejerciciosTotales > 0 
      ? Math.round((ejerciciosCompletados / ejerciciosTotales) * 100) 
      : 0;

    const volumenLevantado = session.ejercicios.reduce((total, ejercicio) => {
      if (ejercicio.completado && ejercicio.pesoReal > 0) {
        return total + (ejercicio.pesoReal * ejercicio.series * ejercicio.repeticiones);
      }
      return total;
    }, 0);

    return {
      ejerciciosCompletados,
      ejerciciosTotales,
      porcentajeCompletado,
      volumenLevantado,
    };
  }

  /**
   * Calcula el tiempo transcurrido en minutos
   */
  getTiempoTranscurrido(): number {
    const session = this.sessionSubject.value;
    if (!session) return 0;

    const tiempoMs = Date.now() - session.tiempoInicio;
    return Math.round(tiempoMs / (1000 * 60));
  }
}
