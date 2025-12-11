import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UserHttpService, UserFromDB } from '../services/user-http.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject = new BehaviorSubject<UserFromDB | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();
    
    private readonly STORAGE_KEY = 'muscleRPG_userId';

    constructor(
        private router: Router,
        private userHttpService: UserHttpService
    ) {
        this.loadUserFromStorage();
    }

    private async loadUserFromStorage() {
        const userId = localStorage.getItem(this.STORAGE_KEY);
        if (userId) {
            try {
                const user = await this.userHttpService.getUserById(userId).toPromise();
                this.currentUserSubject.next(user!);
            } catch (error) {
                console.error('Error loading user:', error);
                this.logout();
            }
        }
    }

    login(email: string, password: string): Observable<any> {
        return this.userHttpService.login({ email, password }).pipe(
            tap(response => {
                const user = response.user;
                localStorage.setItem(this.STORAGE_KEY, user._id);
                this.currentUserSubject.next(user);
            })
        );
    }

    register(userData: any): Observable<any> {
        return this.userHttpService.register(userData).pipe(
            tap(response => {
                const user = response.user;
                localStorage.setItem(this.STORAGE_KEY, user._id);
                this.currentUserSubject.next(user);
            })
        );
    }

    logout(): void {
        localStorage.removeItem(this.STORAGE_KEY);
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    isAuthenticated(): boolean {
        return this.currentUserSubject.value !== null;
    }

    getCurrentUser(): UserFromDB | null {
        return this.currentUserSubject.value;
    }

    getUsername(): string {
        return this.currentUserSubject.value?.nombre || 'Invitado';
    }

    async refreshUser(): Promise<void> {
        const userId = localStorage.getItem(this.STORAGE_KEY);
        if (userId) {
            try {
                const user = await this.userHttpService.getUserById(userId).toPromise();
                this.currentUserSubject.next(user!);
            } catch (error) {
                console.error('Error refreshing user:', error);
            }
        }
    }
}
