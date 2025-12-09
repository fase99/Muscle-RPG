import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'ejercicios',
    pathMatch: 'full'
  },
  {
    path: 'ejercicios',
    loadComponent: () => import('./Ejercicios/ejercicios.component').then(m => m.EjerciciosComponent)
  }
];
