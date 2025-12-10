import { Injectable } from '@angular/core';

export interface Ejercicio {
  nombre: string;
  sets: number;
  reps: string;
  intensidad: number;
  tiempo: number;     // minutos (incluye descansos entre series)
  energia: number;
  hecho: boolean;
}

export interface Rutina {
  dia: string;
  tiempoPlaneado: number;  // siempre 120
  energiaMax: number;
  ejercicios: Ejercicio[];
}

@Injectable({
  providedIn: 'root'
})
export class RutinaService {
  obtenerRutinaMock(): Rutina {
    const ejercicios: Ejercicio[] = [
      { nombre: "Sentadilla Libre",           sets: 4, reps: "8-10",   intensidad: 78, tiempo: 19, energia: 24, hecho: false },
      { nombre: "Prensa 45°",                 sets: 4, reps: "10-12",  intensidad: 75, tiempo: 17, energia: 20, hecho: false },
      { nombre: "Zancadas con Mancuernas",    sets: 3, reps: "12/pierna", intensidad: 68, tiempo: 15, energia: 17, hecho: false },
      { nombre: "Curl Femoral Tumbado",       sets: 4, reps: "10-12",  intensidad: 62, tiempo: 14, energia: 14, hecho: false },
      { nombre: "Elevaciones de Talones",     sets: 4, reps: "15-20",  intensidad: 55, tiempo: 11, energia: 10, hecho: false },
      { nombre: "Plancha Isométrica",         sets: 3, reps: "45-60s", intensidad: 0,  tiempo: 9,  energia: 8,  hecho: false },
      { nombre: "Crunch en Polea",            sets: 3, reps: "15-20",  intensidad: 45, tiempo: 8,  energia: 7,  hecho: false }
    ];

    return {
      dia: "Martes – Piernas & Core",
      tiempoPlaneado: 120,     // siempre 120 minutos disponibles
      energiaMax: 100,
      ejercicios
    };
  }
}