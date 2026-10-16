import { Component, effect, inject, signal, untracked } from '@angular/core';

import { ROLE_LABELS, Role, User } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UserService } from '../../core/services/user.service';
import { shortDate } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { TabSyncService } from '../../core/workers/tab-sync.service';

/** Cuentas registradas: el administrador puede promover clientes a administradores y viceversa. */
@Component({
  selector: 'app-users',
  templateUrl: './users.html',
})
export class Users {
  private readonly service = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly sync = inject(TabSyncService);
  protected readonly auth = inject(AuthService);

  protected readonly shortDate = shortDate;
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  constructor() {
    effect(() => {
      this.sync.remoteChanges();
      untracked(() => this.load());
    });
  }

  protected load(): void {
    this.service.list().subscribe({
      next: (list) => {
        this.users.set(list);
        this.error.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected setRole(user: User, rol: Role): void {
    const question = rol === 'admin' ? `Give ${user.nombre} full administrator access?` : `Turn ${user.nombre} into a client?`;
    if (!confirm(question)) return;
    this.busyId.set(user.id);
    this.service.setRole(user.id, rol).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        this.toast.ok(`${updated.nombre} is now ${ROLE_LABELS[updated.rol].toLowerCase()}`);
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(errorMessage(err));
      },
    });
  }
}
