import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RutinaService, Rutina } from './rutina.service';
import { AuthService } from '../auth/auth.service';
import { UserFromDB, UserHttpService } from '../services/user-http.service';
import { WorkoutStateService, WorkoutSession } from '../services/workout-state.service';

@Component({
  selector: 'app-rutina',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './rutina.component.html',
  styleUrls: ['./rutina.component.css']
})
export class RutinaComponent implements OnInit, OnDestroy {
  rutina!: Rutina;
  user: UserFromDB | null = null;

  fechaActual = new Date();

  rutinaSemanal: Rutina[] = [];
  rutinaDelDia: Rutina | null = null; 
  proximasRutinas: Rutina[] = []; 
  diaActual: number = 0;
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  esDescansoProgramado = false; 

  tiempoInicio = 0;
  tiempoRealMinutos = 0;
  sesionActiva = false;
  sesionFinalizada = false;
  energiaGastada = 0;

  loading = false;
  errorMessage = '';
  rutinaGenerada = false;

  private sessionSubscription?: Subscription;
  currentSession: WorkoutSession | null = null;

  constructor(
    private servicio: RutinaService,
    private userHttpService: UserHttpService,
    public authService: AuthService,
    private router: Router,
    private workoutState: WorkoutStateService
  ) {}

ngOnInit() {
  this.sessionSubscription = this.workoutState.session$.subscribe(session => {
    this.currentSession = session;
    
    if (session && session.activa) {
      console.log('[RutinaComponent] 📥 Restaurando sesión activa:', session);
      this.sesionActiva = true;
      this.tiempoInicio = session.tiempoInicio;
      
      if (this.rutinaSemanal.length > 0) {
        this.actualizarEjerciciosDesdeSession(session);
      }
    }
  });

  this.authService.currentUser$
    .subscribe(user => {
      this.user = user;

      if (!user?._id) return;

      const noHayRutinaSemanal = !this.rutinaSemanal || this.rutinaSemanal.length === 0;
      const esPrimeraCarga = !this.rutinaGenerada;

      if (noHayRutinaSemanal || esPrimeraCarga) {
        this.cargarRutinasExistentes();
      }
    });
}

ngOnDestroy() {
  if (this.sessionSubscription) {
    this.sessionSubscription.unsubscribe();
  }
}

  cargarRutinasExistentes() {
    const userId = this.user?._id;
    if (!userId) return;

    this.loading = true;
    this.servicio.getUserRoutines(userId).subscribe({
      next: (rutinas) => {
        if (rutinas && rutinas.length > 0) {
          console.log('✅ Rutinas existentes encontradas:', rutinas);
          
          rutinas.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || a.fecha || 0).getTime();
            const dateB = new Date(b.createdAt || b.fecha || 0).getTime();
            return dateB - dateA;
          });
          
          const rutinasRecientes = rutinas.slice(0, 7);
          rutinasRecientes.reverse(); 
          this.rutinaSemanal = rutinasRecientes.map((r: any) => this.convertirRutinaBackend(r));
          this.filterTodayRoutine();
          
          this.rutinaGenerada = true;
          this.loading = false;
        } else {
          console.log('ℹ️ No se encontraron rutinas existentes');
          this.loading = false;
        }
      },
      error: (error) => {
        console.error(' Error cargando rutinas existentes:', error);
        this.loading = false;
      }
    });
  }

  generarRutinaDiaria() {
    const userId = this.user?._id;
    
    if (!userId) {
      this.errorMessage = 'Usuario no autenticado';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.servicio.generateWeeklyRoutine(userId, 120)
      .subscribe({
        next: (response) => {
          console.log('✅ Rutina semanal generada:', response);
          
          this.rutinaSemanal = response.rutinas.map((r: any) => this.convertirRutinaBackend(r));
          
          this.filterTodayRoutine();
          
          this.rutinaGenerada = true;
          this.loading = false;

          this.sesionActiva = false;
          this.sesionFinalizada = false;
          this.energiaGastada = 0;
          this.tiempoRealMinutos = 0;
        },
        error: (error) => {
          console.error('❌ Error generando rutina:', error);
          this.loading = false;
          
          if (error.status === 404 && error.error?.message?.includes('Perfil')) {
            this.errorMessage = 'Debes completar tu perfil primero. Redirigiendo...';
            setTimeout(() => {
              this.router.navigate(['/setup']);
            }, 2000);
          } else if (error.error?.message?.includes('ejercicios')) {
            this.errorMessage = 'No hay ejercicios disponibles en la base de datos. Contacta al administrador.';
          } else {
            this.errorMessage = error.error?.message || 'Error al generar la rutina';
          }
        }
      });
  }

  regenerarRutina() {
    this.rutinaGenerada = false;
    this.errorMessage = '';
    this.rutinaSemanal = [];
    this.rutinaDelDia = null;
    this.esDescansoProgramado = false;
    this.sesionActiva = false;
    this.sesionFinalizada = false;
    this.energiaGastada = 0;
    this.tiempoRealMinutos = 0;
  }

  cambiarDia(dia: number) {
    console.warn('[RutinaComponent] ⚠️ Cambio de día deshabilitado. Solo se muestra la rutina del día actual.');
  }

  volverAlInicio() {
    this.router.navigate(['/home']);
  }

  private convertirRutinaBackend(rutinaBackend: any): Rutina {
    const ejercicios = rutinaBackend.ejercicios.map((ej: any) => ({
      nombre: ej.nombre || `Ejercicio ${ej.externalId}`,
      externalId: ej.externalId,
      series: ej.series,
      sets: ej.series,
      repeticiones: ej.repeticiones,
      reps: `${ej.repeticiones}`,
      peso: ej.peso || 0,
      intensidad: ej.rir ? this.rirToIntensity(ej.rir) : 75,
      tiempo: ej.costoTiempo || 10,
      costoTiempo: ej.costoTiempo,
      costoFatiga: ej.costoFatiga,
      estimuloXP: ej.estimuloXP,
      energia: ej.costoFatiga || 10,
      rir: ej.rir,
      hecho: false,
      completado: ej.completado || false,
      notas: ej.notas,
      targetMuscles: ej.targetMuscles,
      bodyParts: ej.bodyParts
    }));

    const diaNombre = rutinaBackend.nombre || rutinaBackend.dia || `Día ${this.diaActual + 1}`;
    const muscleGroups = rutinaBackend.muscleGroups || rutinaBackend.targetMuscleGroups || [];
    const muscleGroupText = muscleGroups.length > 0 ? ` - ${muscleGroups.join(' + ')}` : '';

    return {
      _id: rutinaBackend._id,
      dia: `${diaNombre}${muscleGroupText}`,
      nombre: rutinaBackend.nombre,
      descripcion: rutinaBackend.descripcion,
      scheduledDate: rutinaBackend.scheduledDate, 
      tiempoPlaneado: 120,
      tiempoTotal: rutinaBackend.tiempoTotal,
      energiaMax: this.user?.staminaMaxima || 100,
      fatigaTotal: rutinaBackend.fatigaTotal,
      xpTotalEstimado: rutinaBackend.xpTotalEstimado,
      ejercicios,
      volumeLandmarks: rutinaBackend.volumeLandmarks,
      muscleGroups: muscleGroups
    };
  }

  private getDateWithoutTime(date: Date): Date {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly;
  }

  private filterTodayRoutine(): void {
    const today = this.getDateWithoutTime(new Date());
    const dayIndex = today.getDay(); 
    
    console.log('[RutinaComponent] 📅 Filtrando rutina para hoy:', today.toLocaleDateString('es-ES'));
    console.log('[RutinaComponent] 📅 Día de la semana (0=Dom, 1=Lun...6=Sáb):', dayIndex);
    console.log('[RutinaComponent] 📅 Total rutinas disponibles:', this.rutinaSemanal.length);
    
    const todayRoutine = this.rutinaSemanal.find((r, index) => {
      if (r.scheduledDate) {
        const rutinaDate = this.getDateWithoutTime(new Date(r.scheduledDate));
        const matches = rutinaDate.getTime() === today.getTime();
        console.log(`[RutinaComponent] Rutina ${index}: ${r.nombre}, scheduledDate: ${rutinaDate.toLocaleDateString()}, matches: ${matches}`);
        return matches;
      } else {
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; 
        const matches = index === adjustedIndex;
        console.log(`[RutinaComponent] Rutina ${index}: ${r.nombre}, sin scheduledDate, index match (${adjustedIndex}): ${matches}`);
        return matches;
      }
    });
    
    if (todayRoutine) {
      this.rutinaDelDia = todayRoutine;
      this.rutina = todayRoutine;
      this.esDescansoProgramado = todayRoutine.ejercicios.length === 0;
      this.diaActual = this.rutinaSemanal.indexOf(todayRoutine);
      
      console.log('[RutinaComponent] ✅ Rutina de hoy encontrada:', {
        nombre: todayRoutine.nombre,
        ejercicios: todayRoutine.ejercicios.length,
        esDescanso: this.esDescansoProgramado,
        index: this.diaActual
      });
    } else {
      this.rutinaDelDia = null;
      this.esDescansoProgramado = true;
      
      console.log('[RutinaComponent] ⚠️ No hay rutina programada para hoy - Día de descanso');
    }
    
    this.getUpcomingRoutines();
  }
  
  private getUpcomingRoutines(): void {
    this.proximasRutinas = [];
    
    if (!this.rutinaSemanal || this.rutinaSemanal.length === 0) {
      console.log('[RutinaComponent] ⚠️ No hay rutinas semanales disponibles');
      return;
    }
    
    const currentDayIndex = this.diaActual;
    
    console.log('[RutinaComponent] 📅 Obteniendo próximas rutinas. Día actual index:', currentDayIndex);
    
    for (let i = 1; i <= 5; i++) {
      const nextIndex = (currentDayIndex + i) % this.rutinaSemanal.length;
      this.proximasRutinas.push(this.rutinaSemanal[nextIndex]);
    }
    
    console.log('[RutinaComponent] 📅 Próximas rutinas encontradas:', this.proximasRutinas.length);
    this.proximasRutinas.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.nombre} - ${r.ejercicios.length} ejercicios`);
    });
  }
  
  isRoutineAvailable(routineDate?: Date | string): boolean {
    if (!routineDate) return false;
    
    const today = this.getDateWithoutTime(new Date());
    const schedDate = this.getDateWithoutTime(new Date(routineDate));
    
    return today.getTime() === schedDate.getTime();
  }
  
  getDayName(date?: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[d.getDay()];
  }
  
  formatShortDate(date?: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  }
  
  getMuscleGroupName(nombre?: string): string {
    if (!nombre) return 'Entrenamiento';
    const parts = nombre.split(' - ');
    return parts[1] || parts[0] || 'Entrenamiento';
  }

  private rirToIntensity(rir: number): number {
    if (rir <= 1) return 92;
    if (rir === 2) return 80;
    if (rir === 3) return 75;
    return 70;
  }

  cargarRutinaMock() {
    this.rutina = this.servicio.obtenerRutinaMock();
    this.rutinaGenerada = true;
    this.sesionActiva = false;
    this.sesionFinalizada = false;
    this.tiempoRealMinutos = 0;
    this.energiaGastada = 0;

    this.rutina.ejercicios.forEach(e => e.hecho = false);
  }

  get userName(): string {
    return this.user?.nombre || 'Invitado';
  }

  get userLevel(): number {
    return this.user?.nivel || 1;
  }

  cargarRutina() {
    this.rutina = this.servicio.obtenerRutinaMock();
    this.sesionActiva = false;
    this.sesionFinalizada = false;
    this.tiempoRealMinutos = 0;
    this.energiaGastada = 0;

    this.rutina.ejercicios.forEach(e => e.hecho = false);
  }

  comenzarEntrenamiento() {
    if (!this.user?._id || !this.rutina) {
      console.error('[RutinaComponent] ❌ No hay usuario o rutina para comenzar');
      return;
    }

    this.sesionActiva = true;
    this.sesionFinalizada = false;
    this.tiempoInicio = Date.now();

    const ejercicios = this.rutina.ejercicios.map(ej => ({
      externalId: ej.externalId || '',
      nombre: ej.nombre,
      series: ej.series,
      repeticiones: ej.repeticiones,
      pesoPlaneado: ej.peso || 0,
      pesoReal: 0,
      rirPlaneado: ej.rir || 2,
      rirReal: 0,
      completado: false,
      notas: undefined,
    }));

    this.workoutState.startSession({
      userId: this.user._id,
      rutinaId: this.rutina._id,
      ejercicios,
      staminaInicial: this.rutina.energiaMax || 100,
    });

    console.log('[RutinaComponent] 🏁 Sesión iniciada y guardada en WorkoutStateService');
  }

  finalizarEntrenamiento() {
    if (!this.sesionActiva) return;

    this.finalizarEntrenamientoConBackend();
    this.tiempoRealMinutos = Math.round((Date.now() - this.tiempoInicio) / 60000);

    if (this.rutina._id && this.user?._id) {
      this.actualizarProgresoUsuario();
    }
  }

  private actualizarProgresoUsuario() {
    const userId = this.user!._id;
    const xpGanada = this.rutina.xpTotalEstimado || 0;
    const staminaUsada = this.energiaGastada;

    this.userHttpService.updateExperiencia(userId, xpGanada).subscribe({
      next: () => {
        console.log('✅ XP actualizada:', xpGanada);
        this.authService.refreshUser();
      },
      error: (err) => console.error('Error actualizando XP:', err)
    });

    this.userHttpService.updateStamina(userId, staminaUsada).subscribe({
      next: () => {
        console.log('✅ Stamina actualizada:', staminaUsada);
        this.authService.refreshUser();
      },
      error: (err) => console.error('Error actualizando Stamina:', err)
    });

    if (this.rutina._id) {
      this.servicio.completeRoutine(this.rutina._id).subscribe({
        next: () => console.log('✅ Rutina marcada como completada'),
        error: (err) => console.error('Error marcando rutina:', err)
      });
    }
  }

marcarEjercicio(ej: any, index: number) {
  if (this.sesionFinalizada || !this.sesionActiva) return;
  if (ej.hecho) return;

  const costoEjercicio = ej.energia ?? 0;
  const energiaRestanteActual = this.energiaRestante(); 

  const gastoReal = Math.min(costoEjercicio, energiaRestanteActual);

  this.energiaGastada += gastoReal;
  ej.hecho = true;


  const pesoReal = ej.peso || 0;
  const rirReal = ej.rir || 2;
  this.workoutState.completeExercise(index, pesoReal, rirReal, ej.notas);

  console.log(`Ejercicio marcado. Energía gastada: +${gastoReal} (quedan ${this.energiaRestante()})`);
}

  tiempoTranscurrido(): number {
    if (!this.sesionActiva) return this.tiempoRealMinutos;
    return Math.floor((Date.now() - this.tiempoInicio) / 60000);
  }

  ejerciciosCompletados(): number {
    return this.rutina.ejercicios.filter(e => e.hecho).length;
  }

energiaRestante(): number {
  const max = this.rutina?.energiaMax || 100;
  return Math.max(0, max - this.energiaGastada);
}

  contarEjerciciosConPeso(): number {
    if (!this.rutina?.ejercicios) return 0;
    return this.rutina.ejercicios.filter(ej => ej.peso && ej.peso > 0).length;
  }

  obtenerPesoPromedio(): number {
    if (!this.rutina?.ejercicios) return 0;
    const ejerciciosConPeso = this.rutina.ejercicios.filter(ej => ej.peso && ej.peso > 0);
    if (ejerciciosConPeso.length === 0) return 0;
    
    const sumaTotal = ejerciciosConPeso.reduce((sum, ej) => sum + (ej.peso || 0), 0);
    return sumaTotal / ejerciciosConPeso.length;
  }

  obtenerRIRPromedio(): number {
    if (!this.rutina?.ejercicios) return 2;
    const ejerciciosConRIR = this.rutina.ejercicios.filter(ej => ej.rir !== undefined);
    if (ejerciciosConRIR.length === 0) return 2;
    
    const sumaTotal = ejerciciosConRIR.reduce((sum, ej) => sum + (ej.rir || 0), 0);
    return sumaTotal / ejerciciosConRIR.length;
  }

  private actualizarEjerciciosDesdeSession(session: WorkoutSession): void {
    if (!this.rutina?.ejercicios) return;

    session.ejercicios.forEach((sessionEj, index) => {
      if (index < this.rutina.ejercicios.length) {
        this.rutina.ejercicios[index].hecho = sessionEj.completado;
        this.rutina.ejercicios[index].completado = sessionEj.completado;
        this.rutina.ejercicios[index].peso = sessionEj.pesoReal || sessionEj.pesoPlaneado;
        this.rutina.ejercicios[index].notas = sessionEj.notas;
      }
    });

    console.log('[RutinaComponent] 🔄 Ejercicios actualizados desde sesión');
  }

  async finalizarEntrenamientoConBackend(): Promise<void> {
    if (!this.user?._id || !this.rutina) {
      console.error('[RutinaComponent] ❌ No hay usuario o rutina para finalizar');
      alert('Error: No hay usuario o rutina activa');
      return;
    }

    const session = this.currentSession;
    if (!session) {
      console.error('[RutinaComponent] ❌ No hay sesión activa');
      alert('Error: No hay sesión de entrenamiento activa');
      return;
    }

    const ejerciciosSinId = session.ejercicios.filter(ej => !ej.externalId);
    if (ejerciciosSinId.length > 0) {
      console.error('[RutinaComponent] ❌ Ejercicios sin externalId:', ejerciciosSinId);
      alert(`Error: ${ejerciciosSinId.length} ejercicio(s) no tienen ID. No se puede completar el entrenamiento.`);
      return;
    }

    const duracion = this.tiempoTranscurrido();
    this.workoutState.updateSessionStats(duracion, this.energiaGastada);

    this.loading = true;

    try {
      const completeData = {
        userId: this.user._id,
        rutinaId: this.rutina._id,
        ejercicios: session.ejercicios,
        duration: duracion,
        staminaUsada: this.energiaGastada,
      };

      console.log('[RutinaComponent] 📤 Enviando datos de finalización:', completeData);
      const result = await this.servicio.completeWorkout(completeData).toPromise();
      console.log('[RutinaComponent] ✅ Respuesta del backend:', result);

      if (result.levelUp) {
        alert(`🎉 ¡Entrenamiento completado! ¡Subiste a ${result.newProfileLevel}!\\n\\nXP ganada: ${result.xpGanada}\\nVolumen total: ${result.totalVolumeLifted}kg`);
      } else {
        alert(`✅ ¡Entrenamiento completado!\\n\\nXP ganada: ${result.xpGanada}\\nVolumen total: ${result.totalVolumeLifted}kg`);
      }

      this.workoutState.clearSession();
      this.sesionFinalizada = true;
      this.sesionActiva = false;

    } catch (error: any) {
      console.error('[RutinaComponent] ❌ Error finalizando entrenamiento:', error);
      console.error('[RutinaComponent] ❌ Error completo:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Error al guardar el entrenamiento. Por favor, intenta de nuevo.';
      
      if (error?.error?.message) {
        errorMessage = `Error: ${error.error.message}`;
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      this.loading = false;
    }
  }
}
