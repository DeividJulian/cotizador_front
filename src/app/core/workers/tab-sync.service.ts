import { Injectable, signal } from '@angular/core';

interface WorkerMessage {
  type: 'hello' | 'tabs' | 'data-changed';
  total?: number;
  action?: string;
  at?: number;
  lastChange?: { action: string; at: number } | null;
}

/**
 * SHARED WORKER: connects this tab with public/shared-worker.js.
 * Every tab shares the same worker, so they learn about each other's changes.
 */
@Injectable({ providedIn: 'root' })
export class TabSyncService {
  readonly available = signal(false);
  readonly openTabs = signal(1);
  /** Goes up by one each time ANOTHER tab changes data: the pages watch it to reload. */
  readonly remoteChanges = signal(0);
  readonly lastRemoteAction = signal<string | null>(null);

  private port: MessagePort | null = null;

  constructor() {
    this.connect();
  }

  notifyChange(action: string): void {
    this.port?.postMessage({ type: 'data-changed', action });
  }

  private connect(): void {
    if (typeof SharedWorker === 'undefined') return; // browser without support

    try {
      const worker = new SharedWorker('/shared-worker.js', { name: 'cotizador-sync-v2' });
      this.port = worker.port;
      this.port.onmessage = (event: MessageEvent<WorkerMessage>) => this.receive(event.data);
      this.port.start();
      this.available.set(true);

      // Closing the tab tells the worker so the tab count stays right
      window.addEventListener('pagehide', () => this.port?.postMessage({ type: 'disconnect' }));
    } catch {
      this.available.set(false);
    }
  }

  private receive(message: WorkerMessage): void {
    if (message.type === 'hello' || message.type === 'tabs') {
      this.openTabs.set(message.total ?? 1);
    }
    if (message.type === 'data-changed') {
      this.lastRemoteAction.set(message.action ?? null);
      this.remoteChanges.update((n) => n + 1);
    }
  }
}
