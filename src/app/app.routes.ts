import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/guards';

// Browser paths stay in Spanish: the user sees them in the address bar
export const routes: Routes = [
  { path: 'login', title: 'Iniciar sesión · Cotizador IA', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login').then((m) => m.Login) },
  { path: 'registro', title: 'Crear cuenta · Cotizador IA', canActivate: [guestGuard], loadComponent: () => import('./features/auth/register').then((m) => m.Register) },

  { path: '', title: 'Panel · Cotizador IA', canActivate: [authGuard], loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
  { path: 'cotizaciones', title: 'Mis cotizaciones · Cotizador IA', canActivate: [authGuard], loadComponent: () => import('./features/quotes/quotes').then((m) => m.Quotes) },
  { path: 'cotizaciones/nueva', title: 'Nueva cotización · Cotizador IA', canActivate: [authGuard], loadComponent: () => import('./features/quote-new/quote-new').then((m) => m.QuoteNew) },
  { path: 'cotizaciones/:id', title: 'Cotización · Cotizador IA', canActivate: [authGuard], loadComponent: () => import('./features/quote-detail/quote-detail').then((m) => m.QuoteDetail) },
  { path: 'tarifas', title: 'Mis tarifas · Cotizador IA', canActivate: [authGuard], loadComponent: () => import('./features/rates/rates').then((m) => m.Rates) },

  { path: '**', redirectTo: '' },
];
