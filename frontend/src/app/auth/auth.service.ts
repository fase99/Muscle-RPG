import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import credentials from './credentials.json';

export interface User {
    username: string;
    password: string;
    nombre: string;
    role: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUser: User | null = null;
    private readonly STORAGE_KEY = 'muscleRPG_user';

    constructor(private router: Router) {
        const savedUser = localStorage.getItem(this.STORAGE_KEY);
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }
    }

    login(username: string, password: string): boolean {
        const user = credentials.users.find(
            u => u.username === username && u.password === password
        );

        if (user) {
            this.currentUser = {
                username: user.username,
                password: '',
                nombre: user.nombre,
                role: user.role
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentUser));
            return true;
        }
        return false;
    }

    logout(): void {
        this.currentUser = null;
        localStorage.removeItem(this.STORAGE_KEY);
        this.router.navigate(['/login']);
    }

    isAuthenticated(): boolean {
        return this.currentUser !== null;
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }

    getUsername(): string {
        return this.currentUser?.nombre || 'Invitado';
    }
}
