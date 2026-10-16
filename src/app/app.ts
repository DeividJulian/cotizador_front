import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ROLE_LABELS } from './core/models';
import { AuthService } from './core/services/auth.service';
import { ConnectionService } from './core/workers/connection.service';
import { TabSyncService } from './core/workers/tab-sync.service';
import { ConnectionStatus } from './shared/connection-status/connection-status';
import { Toasts } from './shared/toasts/toasts';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConnectionStatus, Toasts],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly roleLabels = ROLE_LABELS;

  // Al inyectarlos aquí se registran el Service Worker y la conexión al Shared Worker al abrir la app
  constructor() {
    inject(ConnectionService);
    inject(TabSyncService);
    // Si la sesión venía guardada, se confirma con el backend (y se actualiza el rol si cambió)
    this.auth.refreshProfile();
  }
}
