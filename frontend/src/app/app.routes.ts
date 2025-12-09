import { Routes } from '@angular/router';
import { App } from './app';

export const routes: Routes = [
  {
    path: '',
    component: App,
  },
  {
    path: 'ejercicios',
    loadComponent: () => import('./Ejercicios/ejercicios.component').then(m => m.EjerciciosComponent)
  }
];
