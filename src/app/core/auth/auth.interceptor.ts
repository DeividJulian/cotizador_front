import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { API_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * - Agrega "Authorization: Bearer <token>" a las peticiones del backend (nunca a otros dominios).
 * - Si el backend responde 401 (sesión vencida o inválida), cierra la sesión y lleva al login.
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
        toast.info('Your session expired: log in again');
      }
      return throwError(() => error);
    }),
  );
};
