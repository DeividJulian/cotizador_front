import { Injectable, isDevMode, signal } from '@angular/core';

/**
 * SERVICE WORKER: registra public/sw.js y expone el estado de la conexión.
 * En desarrollo (ng serve) no se registra para evitar confusiones con la caché.
 */
@Injectable({ providedIn: 'root' })
export class ConnectionService {
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  /** true cuando la última respuesta del backend salió de la copia guardada por el Service Worker. */
  readonly dataFromCache = signal(false);
  readonly serviceWorkerActive = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
    this.registerServiceWorker();
  }

  markDataFromCache(fromCache: boolean): void {
    this.dataFromCache.set(fromCache);
  }

  private registerServiceWorker(): void {
    if (isDevMode() || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then(() => this.serviceWorkerActive.set(true))
      .catch(() => this.serviceWorkerActive.set(false));
  }
}
