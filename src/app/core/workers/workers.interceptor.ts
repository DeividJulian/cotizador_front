import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';

import { API_URL } from '../config/api.config';
import { ConnectionService } from './connection.service';
import { TabSyncService } from './tab-sync.service';

const CHANGES_DATA = /\/(cotizaciones|clientes|tarifas|seed)/;

/**
 * - Si una petición modifica datos (POST/PUT/PATCH/DELETE), avisa a las otras pestañas por el Shared Worker.
 * - Si el Service Worker respondió con datos guardados, lo informa a la interfaz.
 */
export const workersInterceptor: HttpInterceptorFn = (request, next) => {
  const sync = inject(TabSyncService);
  const connection = inject(ConnectionService);

  const isApi = request.url.startsWith(API_URL);
  const modifies = isApi && request.method !== 'GET' && CHANGES_DATA.test(request.url);

  return next(request).pipe(
    tap((event) => {
      if (!(event instanceof HttpResponse) || !isApi) return;

      if (modifies && event.ok) {
        sync.notifyChange(`${request.method} ${request.url.replace(API_URL, '')}`);
      }
      if (request.method === 'GET') {
        connection.markDataFromCache(event.headers.get('X-Desde-Cache') === '1');
      }
    }),
  );
};
