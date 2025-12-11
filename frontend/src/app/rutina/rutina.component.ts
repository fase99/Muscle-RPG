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
  tiempoInicio = 0;
  tiempoRealSegundos = 0;     // tiempo definitivo al finalizar
  sesionActiva = false;
  sesionFinalizada = false;   // ← NUEVA bandera
  energiaGastada = 0;
  user: UserFromDB | null = null;

  constructor(
    private servicio: RutinaService,
    public authService: AuthService
  ) {
    this.nuevaRutina();
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  get userName(): string {
    return this.user?.nombre || 'Invitado';
  }

  get userLevel(): number {
    return this.user?.nivel || 1;
  }

  nuevaRutina() {
    this.rutina = this.servicio.obtenerRutinaMock();
    this.tiempoRealSegundos = 0;
    this.energiaGastada = 0;
    this.sesionActiva = false;
    this.sesionFinalizada = false;
  }

  iniciarSesion() {
    this.sesionActiva = true;
    this.sesionFinalizada = false;
    this.tiempoInicio = Date.now();
  }

  finalizarSesion() {
    if (!this.sesionActiva) return;

    this.sesionActiva = false;
    this.sesionFinalizada = true;                    // ← Aquí se bloquea todo
    this.tiempoRealSegundos = Math.round((Date.now() - this.tiempoInicio) / 1000);
  }

  marcarEjercicio(ej: any) {
    // Solo puede marcar si:
    // 1. la sesión está activa, O
    // 2. la sesión ya terminó pero aún no había marcado este ejercicio
    if (this.sesionFinalizada) return;               // ← BLOQUEO TOTAL después de finalizar
    if (!this.sesionActiva && this.tiempoRealSegundos === 0) return;

    if (ej.hecho) return;
    ej.hecho = true;
    this.energiaGastada += ej.energia;
  }

  minutosReales(): number {
    if (this.sesionActiva) {
      return Math.floor((Date.now() - this.tiempoInicio) / 60000);
    }
    return Math.floor(this.tiempoRealSegundos / 60);
  }

  porcentajeEjercicios(): number {
    const total = this.rutina.ejercicios.length;
    const hechos = this.rutina.ejercicios.filter(e => e.hecho).length;
    return total > 0 ? Math.round((hechos / total) * 100) : 0;
  }

  beta(): number {
    const minutos = this.minutosReales();
    return Math.min(minutos / 120, 1);
  }

  energiaRestante(): number {
    return this.rutina.energiaMax - this.energiaGastada;
  }
}