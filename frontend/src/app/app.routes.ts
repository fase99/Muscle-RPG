import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'ejercicios',
    loadComponent: () => import('./Ejercicios/ejercicios.component').then(m => m.EjerciciosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home').then(m =>m.Home),
    canActivate: [authGuard]
  },
  {
  path: 'rutina',
  loadComponent: () =>
    import('./rutina/rutina.component').then(m => m.RutinaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'perfil',
    loadComponent: () => import('./perfil/perfil.component').then(m => m.PerfilComponent)
  }
];
