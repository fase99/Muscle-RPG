import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

export interface WorkoutSession {
  userId: string;
  rutinaId?: string;
  ejercicios: ExerciseProgress[];
  tiempoInicio: number;
  duracion: number; 
  staminaInicial: number;
  staminaUsada: number;
  activa: boolean;
}

const STORAGE_KEY = 'muscle_rpg_workout_session';

@Injectable({
  providedIn: 'root'
})
export class WorkoutStateService {
  
  private sessionSubject = new BehaviorSubject<WorkoutSession | null>(null);
  public session$: Observable<WorkoutSession | null> = this.sessionSubject.asObservable();

  constructor() {
    this.restoreProgress();
  }

  getCurrentSession(): WorkoutSession | null {
    return this.sessionSubject.value;
  }

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

  completeExercise(index: number, pesoReal: number, rirReal: number, notas?: string): void {
    this.updateExercise(index, {
      completado: true,
      pesoReal,
      rirReal,
      notas,
    });
  }

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

  clearSession(): void {
    this.sessionSubject.next(null);
    localStorage.removeItem(STORAGE_KEY);
    console.log('[WorkoutStateService] 🗑️ Sesión limpiada');
  }

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

  restoreProgress(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        console.log('[WorkoutStateService] ℹ️ No hay sesión guardada para restaurar');
        return;
      }

      const session: WorkoutSession = JSON.parse(stored);
      
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

  getTiempoTranscurrido(): number {
    const session = this.sessionSubject.value;
    if (!session) return 0;

    const tiempoMs = Date.now() - session.tiempoInicio;
    return Math.round(tiempoMs / (1000 * 60));
  }
}
