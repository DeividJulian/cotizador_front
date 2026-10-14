import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Dashboard · AI Quoter', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
  { path: 'clientes', title: 'Clients · AI Quoter', loadComponent: () => import('./features/clients/clients').then((m) => m.Clients) },
  { path: 'tarifas', title: 'Rates · AI Quoter', loadComponent: () => import('./features/tariffs/tariffs').then((m) => m.Tariffs) },
  { path: '**', redirectTo: '' },
];
