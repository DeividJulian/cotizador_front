import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Dashboard · AI Quoter', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
  { path: '**', redirectTo: '' },
];
