import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Pantallas del administrador. Sin sesión → login; un cliente → sus cotizaciones. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  return auth.isAdmin() || router.createUrlTree(['/mis-cotizaciones']);
};

/** Pantallas del cliente. Sin sesión → login; un administrador → su panel. */
export const clientGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  return !auth.isAdmin() || router.createUrlTree(['/']);
};

/** Login y registro: si ya hay sesión, no tiene sentido mostrarlos. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !auth.isLoggedIn() || inject(Router).parseUrl(auth.homeUrl());
};
