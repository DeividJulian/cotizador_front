import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** App screens: without a session they go to the login. */
export const authGuard: CanActivateFn = () => inject(AuthService).isLoggedIn() || inject(Router).createUrlTree(['/login']);

/** Login screen: with a session it goes straight to the dashboard. */
export const guestGuard: CanActivateFn = () => !inject(AuthService).isLoggedIn() || inject(Router).createUrlTree(['/']);
