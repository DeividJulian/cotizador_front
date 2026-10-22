import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { API_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * - Adds "Authorization: Bearer <token>" to the backend requests (never to other domains).
 * - When the backend answers 401 (expired or invalid session), logs out and goes to the login.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);

  const isApi = request.url.startsWith(API_URL);
  const token = auth.token();
  const authed = isApi && token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(authed).pipe(
    catchError((error: unknown) => {
      const isAuthRoute = request.url.startsWith(`${API_URL}/auth/`) && !request.url.endsWith('/auth/me');
      if (isApi && !isAuthRoute && error instanceof HttpErrorResponse && error.status === 401 && auth.isLoggedIn()) {
        auth.logout();
        toast.info('Tu sesión venció', 'Inicia sesión de nuevo para continuar.');
      }
      return throwError(() => error);
    }),
  );
};
