import { Injectable, signal } from '@angular/core';

interface WorkerMessage {
  tipo: 'inicio' | 'pestanas' | 'cambio-datos';
  total?: number;
  accion?: string;
  hora?: number;
  ultimoCambio?: { accion: string; hora: number } | null;
}

/**
 * SHARED WORKER: conecta esta pestaña con public/shared-worker.js.
 * Todas las pestañas comparten el mismo worker, así que se enteran entre sí de los cambios.
 */
@Injectable({ providedIn: 'root' })
export class TabSyncService {
  readonly available = signal(false);
  readonly openTabs = signal(1);
  /** Sube de a uno cada vez que OTRA pestaña modifica datos: las páginas lo observan para recargarse. */
  readonly remoteChanges = signal(0);
  readonly lastRemoteAction = signal<string | null>(null);

  private port: MessagePort | null = null;

  constructor() {
    this.connect();
  }

  notifyChange(action: string): void {
    this.port?.postMessage({ tipo: 'cambio-datos', accion: action });
  }

  private connect(): void {
    if (typeof SharedWorker === 'undefined') return; // navegador sin soporte

    try {
      const worker = new SharedWorker('/shared-worker.js', { name: 'cotizador-sync' });
      this.port = worker.port;
      this.port.onmessage = (event: MessageEvent<WorkerMessage>) => this.receive(event.data);
      this.port.start();
      this.available.set(true);

      // Al cerrar la pestaña se avisa para que el contador de pestañas sea correcto
      window.addEventListener('pagehide', () => this.port?.postMessage({ tipo: 'desconectar' }));
    } catch {
      this.available.set(false);
    }
  }

  private receive(message: WorkerMessage): void {
    if (message.tipo === 'inicio' || message.tipo === 'pestanas') {
      this.openTabs.set(message.total ?? 1);
    }
    if (message.tipo === 'cambio-datos') {
      this.lastRemoteAction.set(message.accion ?? null);
      this.remoteChanges.update((n) => n + 1);
    }
  }
}
