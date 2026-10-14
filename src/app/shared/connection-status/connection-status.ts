import { Component, inject } from '@angular/core';

import { ConnectionService } from '../../core/workers/connection.service';
import { TabSyncService } from '../../core/workers/tab-sync.service';

/** Muestra el estado de los workers: Service Worker (offline) y Shared Worker (pestañas). */
@Component({
  selector: 'app-connection-status',
  template: `
    <div class="status">
      @if (!connection.online()) {
        <span class="chip warn">Offline: read-only</span>
      } @else if (connection.dataFromCache()) {
        <span class="chip warn">Showing saved data</span>
      }
      @if (sync.available()) {
        <span class="chip">
          {{ sync.openTabs() }} {{ sync.openTabs() === 1 ? 'tab synced' : 'tabs synced' }}
        </span>
      }
      @if (connection.serviceWorkerActive()) {
        <span class="chip ok">Offline mode ready</span>
      }
    </div>
  `,
  styles: `
    .status { position: fixed; right: 16px; bottom: 16px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; z-index: 50; pointer-events: none; }
    .chip { padding: 6px 12px; border-radius: 999px; font-size: 12px; background: rgba(23, 34, 58, 0.95); color: var(--text); border: 1px solid var(--border); }
    .chip.ok { border-color: rgba(52, 211, 153, 0.6); color: var(--good); }
    .chip.warn { border-color: rgba(251, 191, 36, 0.7); color: var(--warn); }
  `,
})
export class ConnectionStatus {
  protected readonly connection = inject(ConnectionService);
  protected readonly sync = inject(TabSyncService);
}
