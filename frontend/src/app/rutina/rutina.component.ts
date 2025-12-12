import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { RutinaService, Rutina } from './rutina.service';
import { AuthService } from '../auth/auth.service';
import { UserFromDB, UserHttpService } from '../services/user-http.service';

@Component({
  selector: 'app-rutina',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './rutina.component.html',
  styleUrls: ['./rutina.component.css']
})
export class RutinaComponent implements OnInit {
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

  constructor(
    private servicio: RutinaService,
    private userHttpService: UserHttpService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  // === GENERAR RUTINA SEMANAL DESDE EL BACKEND ===
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
          
          // Convertir las rutinas del backend al formato del componente
          this.rutinaSemanal = response.rutinas.map((r: any) => this.convertirRutinaBackend(r));
          this.diaActual = 0;
          this.rutina = this.rutinaSemanal[this.diaActual];
          this.rutinaGenerada = true;
          this.loading = false;

          // Resetear estados
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

  // === CAMBIAR DE DÍA ===
  cambiarDia(dia: number) {
    if (dia >= 0 && dia < this.rutinaSemanal.length) {
      this.diaActual = dia;
      this.rutina = this.rutinaSemanal[dia];
      this.sesionActiva = false;
      this.sesionFinalizada = false;
    }
  }

  // === Convertir rutina del backend al formato del frontend ===
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
      notas: ej.notas
    }));

    return {
      _id: rutinaBackend._id,
      dia: `Misión Diaria - ${new Date().toLocaleDateString()}`,
      nombre: rutinaBackend.nombre,
      descripcion: rutinaBackend.descripcion,
      tiempoPlaneado: 120,
      tiempoTotal: rutinaBackend.tiempoTotal,
      energiaMax: this.user?.staminaMaxima || 100,
      fatigaTotal: rutinaBackend.fatigaTotal,
      xpTotalEstimado: rutinaBackend.xpTotalEstimado,
      ejercicios,
      volumeLandmarks: rutinaBackend.volumeLandmarks
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

  // === Cargar rutina mock (fallback) ===
  cargarRutinaMock() {
    this.rutina = this.servicio.obtenerRutinaMock();
    this.rutinaGenerada = true;
    this.sesionActiva = false;
    this.sesionFinalizada = false;
    this.tiempoRealMinutos = 0;
    this.energiaGastada = 0;

    this.rutina.ejercicios.forEach(e => e.hecho = false);
  }

  // === Getters del usuario ===
  get userName(): string {
    return this.user?.nombre || 'Invitado';
  }

  get userLevel(): number {
    return this.user?.nivel || 1;
  }

  // === Cargar rutina (mezcla de ambos componentes) ===
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
    this.sesionActiva = true;
    this.sesionFinalizada = false;
    this.tiempoInicio = Date.now();
  }

  // === Finalizar sesión (mantiene lógica del primero) ===
  finalizarEntrenamiento() {
    if (!this.sesionActiva) return;

    this.sesionActiva = false;
    this.sesionFinalizada = true;

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

  // === Marcar ejercicios como el PRIMERO ===
  marcarEjercicio(ej: any) {
    if (this.sesionFinalizada || !this.sesionActiva) return;
    if (ej.hecho) return;

    ej.hecho = true;

    // Mantener gasto de energía del SEGUNDO
    this.energiaGastada += ej.energia ?? 0;
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
}
