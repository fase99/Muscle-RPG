import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'ejercicios',
    loadComponent: () => import('./Ejercicios/ejercicios.component').then(m => m.EjerciciosComponent)
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home').then(m =>m.Home)
  },
  {
  path: 'rutina',
  loadComponent: () =>
    import('./rutina/rutina.component').then(m => m.RutinaComponent)
  }

];
