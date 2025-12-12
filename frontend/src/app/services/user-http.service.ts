import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProfileFromDB {
  _id: string;
  userId?: string;
  age: number;
  gender: number;
  experienceMonths: number;
  weight: number;
  height: number;
  nivelactividad: string;
  condicionmedica: boolean;
  knownBodyFat?: number;
  sRpg: number;
  level: string; // Básico | Intermedio | Avanzado
  estimatedBodyFat: number;
  compositionMultiplier: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserFromDB {
  _id: string;
  nombre: string;
  apellido: string;
  edad: number;
  email: string;
  username?: string;
  nivel: number;
  experiencia: number;
  experienciaMaxima: number;
  rachasDias: number;
  logrosObtenidos: number;
  atributos: {
    STR: number;
    AGI: number;
    STA: number;
    INT: number;
    DEX: number;
    END: number;
  };
  profileId?: ProfileFromDB;
  rutinas?: string[];
  metricas?: {
    icon: string;
    label: string;
    subLabel: string;
    value: string;
    unit: string;
    trend: string;
    updatedAt: Date;
  }[];
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  staminaActual?: number;
  staminaMaxima?: number;
}

export interface RegisterRequest {
  nombre: string;
  apellido: string;
  edad: number;
  email: string;
  password: string;
  username?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: UserFromDB;
}

@Injectable({
  providedIn: 'root'
})
export class UserHttpService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, userData);
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials);
  }

  getUserById(id: string): Observable<UserFromDB> {
    return this.http.get<UserFromDB>(`${this.apiUrl}/users/${id}`);
  }

  updateUser(id: string, userData: Partial<UserFromDB>): Observable<UserFromDB> {
    return this.http.patch<UserFromDB>(`${this.apiUrl}/users/${id}`, userData);
  }

  updateMetrics(id: string, metricas: any[]): Observable<UserFromDB> {
    return this.http.patch<UserFromDB>(`${this.apiUrl}/users/${id}/metricas`, { metricas });
  }

  updateExperiencia(id: string, xpGanada: number): Observable<UserFromDB> {
    return this.http.patch<UserFromDB>(`${this.apiUrl}/users/${id}/experiencia`, { xpGanada });
  }

  getUserAchievements(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/${id}/achievements`);
  }

  getNextAchievement(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/${id}/achievements/next`);
  }

  checkAchievements(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/${id}/achievements/check`, {});
  }

  updateStamina(id: string, staminaCost: number): Observable<UserFromDB> {
    return this.http.patch<UserFromDB>(`${this.apiUrl}/users/${id}/stamina`, { staminaCost });
  }
}
