import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RutinaService, Rutina } from './rutina.service';
import { AuthService } from '../auth/auth.service';
import { UserFromDB } from '../services/user-http.service';

@Component({
  selector: 'app-rutina',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rutina.component.html',
  styleUrls: ['./rutina.component.css']
})
export class RutinaComponent implements OnInit {
  rutina!: Rutina;

  // === Variables del PRIMER componente ===
  tiempoInicio = 0;
  tiempoRealMinutos = 0;
  sesionActiva = false;
  sesionFinalizada = false;

  // === Variables del SEGUNDO componente ===
  energiaGastada = 0;
  user: UserFromDB | null = null;

  constructor(
    private servicio: RutinaService,
    public authService: AuthService
  ) {
    this.cargarRutina();
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
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

    // Ahora en minutos como EL PRIMERO componente
    this.tiempoRealMinutos = Math.round((Date.now() - this.tiempoInicio) / 60000);
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
