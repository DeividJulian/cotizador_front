import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/guards';

export const routes: Routes = [
  { path: 'login', title: 'Log in · AI Quoter', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login').then((m) => m.Login) },

  { path: '', title: 'Dashboard · AI Quoter', canActivate: [authGuard], loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
  { path: 'cotizaciones', title: 'My quotes · AI Quoter', canActivate: [authGuard], loadComponent: () => import('./features/quotes/quotes').then((m) => m.Quotes) },
  { path: 'cotizaciones/nueva', title: 'New quote · AI Quoter', canActivate: [authGuard], loadComponent: () => import('./features/quote-new/quote-new').then((m) => m.QuoteNew) },
  { path: 'cotizaciones/:id', title: 'Quote detail · AI Quoter', canActivate: [authGuard], loadComponent: () => import('./features/quote-detail/quote-detail').then((m) => m.QuoteDetail) },
  { path: 'tarifas', title: 'My rates · AI Quoter', canActivate: [authGuard], loadComponent: () => import('./features/tariffs/tariffs').then((m) => m.Tariffs) },

  { path: '**', redirectTo: '' },
];
