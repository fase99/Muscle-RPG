import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    // Si ya está autenticado en memoria, permitir
    if (authService.isAuthenticated()) {
        return true;
    }

    // Si hay un userId en localStorage, permitir la navegación
    // y refrescar el usuario en background para poblar el estado.
    const storedId = localStorage.getItem('muscleRPG_userId');
    if (storedId) {
        // no await: dejamos que la navegación continúe mientras se refresca el usuario
        authService.refreshUser();
        return true;
    }

    // No autenticado: redirigir al login
    router.navigate(['/login']);
    return false;
};
