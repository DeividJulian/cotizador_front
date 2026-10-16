import { Routes } from '@angular/router';

import { adminGuard, clientGuard, guestGuard } from './core/auth/guards';

export const routes: Routes = [
  // Acceso
  { path: 'login', title: 'Log in · AI Quoter', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login').then((m) => m.Login) },
  { path: 'registro', title: 'Sign up · AI Quoter', canActivate: [guestGuard], loadComponent: () => import('./features/auth/register').then((m) => m.Register) },

  // Administrador
  { path: '', title: 'Dashboard · AI Quoter', canActivate: [adminGuard], loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
  { path: 'cotizaciones', title: 'Quotes · AI Quoter', canActivate: [adminGuard], loadComponent: () => import('./features/quotes/quotes').then((m) => m.Quotes) },
  { path: 'cotizaciones/nueva', title: 'New quote · AI Quoter', canActivate: [adminGuard], loadComponent: () => import('./features/quote-new/quote-new').then((m) => m.QuoteNew) },
  { path: 'cotizaciones/:id', title: 'Quote detail · AI Quoter', canActivate: [adminGuard], loadComponent: () => import('./features/quote-detail/quote-detail').then((m) => m.QuoteDetail) },
  { path: 'clientes', title: 'Clients · AI Quoter', canActivate: [adminGuard], loadComponent: () => import('./features/clients/clients').then((m) => m.Clients) },
  { path: 'tarifas', title: 'Rates · AI Quoter', canActivate: [adminGuard], loadComponent: () => import('./features/tariffs/tariffs').then((m) => m.Tariffs) },
  { path: 'usuarios', title: 'Users · AI Quoter', canActivate: [adminGuard], loadComponent: () => import('./features/users/users').then((m) => m.Users) },

  // Cliente
  { path: 'mis-cotizaciones', title: 'My quotes · AI Quoter', canActivate: [clientGuard], loadComponent: () => import('./features/my-quotes/my-quotes').then((m) => m.MyQuotes) },
  { path: 'mis-cotizaciones/:id', title: 'My quote · AI Quoter', canActivate: [clientGuard], loadComponent: () => import('./features/my-quotes/my-quote').then((m) => m.MyQuote) },

  { path: '**', redirectTo: '' },
];
