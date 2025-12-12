import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
}
