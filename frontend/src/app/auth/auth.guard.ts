import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated()) {
        return true;
    }
    const storedId = localStorage.getItem('muscleRPG_userId');
    if (storedId) {
        authService.refreshUser();
        return true;
    }

    router.navigate(['/login']);
    return false;
};
