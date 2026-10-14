import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Client, ClientInput } from '../../core/models';
import { ClientService } from '../../core/services/client.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/http-error';
import { TabSyncService } from '../../core/workers/tab-sync.service';

@Component({
  selector: 'app-clients',
  imports: [ReactiveFormsModule],
  templateUrl: './clients.html',
})
export class Clients {
  private readonly service = inject(ClientService);
  private readonly toast = inject(ToastService);
  private readonly sync = inject(TabSyncService);
  private readonly fb = inject(FormBuilder);

  protected readonly clients = signal<Client[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    empresa: [''],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
  });

  constructor() {
    effect(() => {
      this.sync.remoteChanges();
      untracked(() => this.load());
    });
  }

  protected load(): void {
    this.service.list().subscribe({
      next: (list) => {
        this.clients.set(list);
        this.error.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '', empresa: '', email: '', telefono: '' });
    this.formOpen.set(true);
  }

  protected openEdit(c: Client): void {
    this.editingId.set(c.id);
    this.form.reset({ nombre: c.nombre, empresa: c.empresa ?? '', email: c.email, telefono: c.telefono ?? '' });
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: ClientInput = {
      nombre: v.nombre.trim(),
      empresa: v.empresa.trim() || null,
      email: v.email.trim(),
      telefono: v.telefono.trim() || null,
    };
    const id = this.editingId();
    this.saving.set(true);
    (id === null ? this.service.create(input) : this.service.update(id, input)).subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.ok(id === null ? 'Client registered' : 'Client updated');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }

  protected remove(c: Client): void {
    if (!confirm(`Delete ${c.nombre}?`)) return;
    this.service.remove(c.id).subscribe({
      next: () => {
        this.toast.ok('Client deleted');
        this.load();
      },
      error: (err) => this.toast.error(errorMessage(err)),
    });
  }
}
