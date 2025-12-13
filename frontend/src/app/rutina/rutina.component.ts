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

  // === Rutina semanal ===
  rutinaSemanal: Rutina[] = [];
  diaActual: number = 0;
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // === Estados de la sesión ===
  tiempoInicio = 0;
  tiempoRealMinutos = 0;
  sesionActiva = false;
  sesionFinalizada = false;
  energiaGastada = 0;

  // === Estados de carga ===
  loading = false;
  errorMessage = '';
  rutinaGenerada = false;

  // === State management ===
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
  // Suscribirse al estado de la sesión
  this.sessionSubscription = this.workoutState.session$.subscribe(session => {
    this.currentSession = session;
    
    // Si hay una sesión activa, restaurar el estado de la UI
    if (session && session.activa) {
      console.log('[RutinaComponent] 📥 Restaurando sesión activa:', session);
      this.sesionActiva = true;
      this.tiempoInicio = session.tiempoInicio;
      
      // Restaurar la rutina si existe
      if (this.rutinaSemanal.length > 0) {
        this.actualizarEjerciciosDesdeSession(session);
      }
    }
  });

  this.authService.currentUser$
    .subscribe(user => {
      this.user = user;

      if (!user?._id) return;

      // Solo cargar si es la primera vez o si no hay rutina semanal
      const noHayRutinaSemanal = !this.rutinaSemanal || this.rutinaSemanal.length === 0;
      const esPrimeraCarga = !this.rutinaGenerada;

      if (noHayRutinaSemanal || esPrimeraCarga) {
        this.cargarRutinasExistentes();
      }
    });
}

ngOnDestroy() {
  // Limpiar suscripciones
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
          rutinasRecientes.reverse(); // ← Esto arregla el orden de los días
          this.rutinaSemanal = rutinasRecientes.map((r: any) => this.convertirRutinaBackend(r));
          this.diaActual = 0;
          this.rutina = this.rutinaSemanal[this.diaActual];
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
          this.diaActual = 0;
          this.rutina = this.rutinaSemanal[this.diaActual];
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
    this.sesionActiva = false;
    this.sesionFinalizada = false;
    this.energiaGastada = 0;
    this.tiempoRealMinutos = 0;
  }

  cambiarDia(dia: number) {
    if (dia >= 0 && dia < this.rutinaSemanal.length) {
      this.diaActual = dia;
      this.rutina = this.rutinaSemanal[dia];
      this.sesionActiva = false;
      this.sesionFinalizada = false;
    }
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

  // === Convertir RIR a % de intensidad aproximado ===
  private rirToIntensity(rir: number): number {
    // RIR 0-1 = 90-95%, RIR 2 = 80%, RIR 3 = 75%
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

    // Reiniciar flags de ejercicios
    this.rutina.ejercicios.forEach(e => e.hecho = false);
  }

  // === Comenzar sesión (del primer componente) ===
  comenzarEntrenamiento() {
    if (!this.user?._id || !this.rutina) {
      console.error('[RutinaComponent] ❌ No hay usuario o rutina para comenzar');
      return;
    }

    this.sesionActiva = true;
    this.sesionFinalizada = false;
    this.tiempoInicio = Date.now();

    // Iniciar sesión en WorkoutStateService
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

  // === Finalizar sesión ===
  finalizarEntrenamiento() {
    if (!this.sesionActiva) return;

    // Llamar al método que envía datos al backend
    this.finalizarEntrenamientoConBackend();
    
    // Ahora en minutos
    this.tiempoRealMinutos = Math.round((Date.now() - this.tiempoInicio) / 60000);

    // Actualizar XP y Stamina del usuario en el backend
    if (this.rutina._id && this.user?._id) {
      this.actualizarProgresoUsuario();
    }
  }

  // === Actualizar progreso del usuario ===
  private actualizarProgresoUsuario() {
    const userId = this.user!._id;
    const xpGanada = this.rutina.xpTotalEstimado || 0;
    const staminaUsada = this.energiaGastada;

    // Actualizar XP
    this.userHttpService.updateExperiencia(userId, xpGanada).subscribe({
      next: () => {
        console.log('✅ XP actualizada:', xpGanada);
        this.authService.refreshUser();
      },
      error: (err) => console.error('Error actualizando XP:', err)
    });

    // Actualizar Stamina
    this.userHttpService.updateStamina(userId, staminaUsada).subscribe({
      next: () => {
        console.log('✅ Stamina actualizada:', staminaUsada);
        this.authService.refreshUser();
      },
      error: (err) => console.error('Error actualizando Stamina:', err)
    });

    // Marcar rutina como completada en el backend
    if (this.rutina._id) {
      this.servicio.completeRoutine(this.rutina._id).subscribe({
        next: () => console.log('✅ Rutina marcada como completada'),
        error: (err) => console.error('Error marcando rutina:', err)
      });
    }
  }

  // === Marcar ejercicios ===
  marcarEjercicio(ej: any, index: number) {
    if (this.sesionFinalizada || !this.sesionActiva) return;
    if (ej.hecho) return;

    ej.hecho = true;

    // Mantener gasto de energía
    this.energiaGastada += ej.energia ?? 0;

    // Actualizar en WorkoutStateService
    const pesoReal = ej.peso || 0;
    const rirReal = ej.rir || 2;

    this.workoutState.completeExercise(index, pesoReal, rirReal, ej.notas);
    console.log(`[RutinaComponent] ✅ Ejercicio ${index} marcado como completado en WorkoutStateService`);
  }

  // === Tiempo transcurrido (del PRIMERO) ===
  tiempoTranscurrido(): number {
    if (!this.sesionActiva) return this.tiempoRealMinutos;
    return Math.floor((Date.now() - this.tiempoInicio) / 60000);
  }

  // === Ejercicios completados (del PRIMERO) ===
  ejerciciosCompletados(): number {
    return this.rutina.ejercicios.filter(e => e.hecho).length;
  }

  // === Stamina o energía restante (mezcla lógica 1 + 2) ===
  energiaRestante(): number {
    return this.rutina.energiaMax - this.energiaGastada;
  }

  // === Métodos para resumen de cargas ===
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

  // === Métodos para WorkoutStateService ===

  /**
   * Actualiza los ejercicios de la rutina desde la sesión guardada
   */
  private actualizarEjerciciosDesdeSession(session: WorkoutSession): void {
    if (!this.rutina?.ejercicios) return;

    // Actualizar el estado de los ejercicios desde la sesión
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

  /**
   * Finaliza el entrenamiento y envía los datos al backend
   */
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

    // Validar que todos los ejercicios tengan externalId
    const ejerciciosSinId = session.ejercicios.filter(ej => !ej.externalId);
    if (ejerciciosSinId.length > 0) {
      console.error('[RutinaComponent] ❌ Ejercicios sin externalId:', ejerciciosSinId);
      alert(`Error: ${ejerciciosSinId.length} ejercicio(s) no tienen ID. No se puede completar el entrenamiento.`);
      return;
    }

    // Actualizar duración y stamina en la sesión
    const duracion = this.tiempoTranscurrido();
    this.workoutState.updateSessionStats(duracion, this.energiaGastada);

    this.loading = true;

    try {
      // Preparar datos para el backend
      const completeData = {
        userId: this.user._id,
        rutinaId: this.rutina._id,
        ejercicios: session.ejercicios,
        duration: duracion,
        staminaUsada: this.energiaGastada,
      };

      console.log('[RutinaComponent] 📤 Enviando datos de finalización:', completeData);

      // Enviar al backend
      const result = await this.servicio.completeWorkout(completeData).toPromise();

      console.log('[RutinaComponent] ✅ Respuesta del backend:', result);

      // Mostrar mensaje de éxito
      if (result.levelUp) {
        alert(`🎉 ¡Entrenamiento completado! ¡Subiste a ${result.newProfileLevel}!\\n\\nXP ganada: ${result.xpGanada}\\nVolumen total: ${result.totalVolumeLifted}kg`);
      } else {
        alert(`✅ ¡Entrenamiento completado!\\n\\nXP ganada: ${result.xpGanada}\\nVolumen total: ${result.totalVolumeLifted}kg`);
      }

      // Limpiar sesión
      this.workoutState.clearSession();
      
      // Actualizar estado de UI
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
