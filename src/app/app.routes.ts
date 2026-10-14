import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Dashboard · AI Quoter', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
  { path: 'cotizaciones', title: 'Quotes · AI Quoter', loadComponent: () => import('./features/quotes/quotes').then((m) => m.Quotes) },
  {
    path: 'cotizaciones/nueva',
    title: 'New quote · AI Quoter',
    loadComponent: () => import('./features/quote-new/quote-new').then((m) => m.QuoteNew),
  },
  { path: 'clientes', title: 'Clients · AI Quoter', loadComponent: () => import('./features/clients/clients').then((m) => m.Clients) },
  { path: 'tarifas', title: 'Rates · AI Quoter', loadComponent: () => import('./features/tariffs/tariffs').then((m) => m.Tariffs) },
  { path: '**', redirectTo: '' },
];
