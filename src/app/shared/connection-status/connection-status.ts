import { Component, inject } from '@angular/core';

import { ConnectionService } from '../../core/workers/connection.service';
import { TabSyncService } from '../../core/workers/tab-sync.service';
import { Icon } from '../icon/icon';

/** State of the workers: Service Worker (offline mode) and Shared Worker (synced tabs). */
@Component({
  selector: 'app-connection-status',
  imports: [Icon],
  template: `
    <div class="status-dock" aria-live="polite">
      @if (!connection.online()) {
        <span class="status-chip status-chip--offline"><app-icon name="offline" />Sin conexión: solo lectura</span>
      } @else if (connection.dataFromCache()) {
        <span class="status-chip status-chip--offline"><app-icon name="offline" />Mostrando datos guardados</span>
      }
      @if (sync.available() && sync.openTabs() > 1) {
        <span class="status-chip status-chip--synced">
          <span class="status-chip__dot"></span>{{ sync.openTabs() }} pestañas sincronizadas
        </span>
      }
      @if (connection.serviceWorkerActive()) {
        <span class="status-chip status-chip--ready"><span class="status-chip__dot"></span>Modo sin conexión listo</span>
      }
    </div>
  `,
})
export class ConnectionStatus {
  protected readonly connection = inject(ConnectionService);
  protected readonly sync = inject(TabSyncService);
}
