import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Pantallas de la app: sin sesión llevan al login. */
export const authGuard: CanActivateFn = () => inject(AuthService).isLoggedIn() || inject(Router).createUrlTree(['/login']);

/** Pantalla de login: si ya hay sesión, va directo al panel. */
export const guestGuard: CanActivateFn = () => !inject(AuthService).isLoggedIn() || inject(Router).createUrlTree(['/']);
