import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { initials } from './core/utils/format';
import { ConnectionService } from './core/workers/connection.service';
import { TabSyncService } from './core/workers/tab-sync.service';
import { ConnectionStatus } from './shared/connection-status/connection-status';
import { Icon } from './shared/icon/icon';
import { Toasts } from './shared/toasts/toasts';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConnectionStatus, Toasts, Icon],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly initials = initials;

  // Injecting them here registers the Service Worker and connects to the Shared Worker when the app opens
  constructor() {
    inject(ConnectionService);
    inject(TabSyncService);
    // A saved session is confirmed with the backend
    this.auth.refreshProfile();
  }
}
