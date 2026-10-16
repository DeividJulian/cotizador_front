import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Tariff } from '../../core/models';
import { TariffService } from '../../core/services/tariff.service';
import { ToastService } from '../../core/services/toast.service';
import { cop } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { TabSyncService } from '../../core/workers/tab-sync.service';

@Component({
  selector: 'app-tariffs',
  imports: [ReactiveFormsModule],
  templateUrl: './tariffs.html',
})
export class Tariffs {
  private readonly service = inject(TariffService);
  private readonly toast = inject(ToastService);
  private readonly sync = inject(TabSyncService);
  private readonly fb = inject(FormBuilder);

  protected readonly cop = cop;

  protected readonly tariffs = signal<Tariff[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly restoring = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    rol: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    valor_hora: [0, [Validators.required, Validators.min(1), Validators.max(2_000_000)]],
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
        this.tariffs.set(list);
        this.error.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected edit(t: Tariff): void {
    this.editingId.set(t.id);
    this.form.reset({ rol: t.rol, valor_hora: t.valor_hora });
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.form.reset({ rol: '', valor_hora: 0 });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const input = { rol: this.form.controls.rol.value.trim(), valor_hora: Number(this.form.controls.valor_hora.value) };
    const id = this.editingId();
    this.saving.set(true);
    (id === null ? this.service.create(input) : this.service.update(id, input)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.ok(id === null ? 'Rate created' : 'Rate updated');
        this.cancel();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }

  protected restoreMarket(): void {
    if (this.tariffs().length && !confirm('Replace all your rates with the market reference rates?')) return;
    this.restoring.set(true);
    this.service.restoreMarket().subscribe({
      next: (list) => {
        this.restoring.set(false);
        this.tariffs.set(list);
        this.cancel();
        this.toast.ok('Market rates restored');
      },
      error: (err) => {
        this.restoring.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }

  protected remove(t: Tariff): void {
    if (!confirm(`Delete the rate for ${t.rol}?`)) return;
    this.service.remove(t.id).subscribe({
      next: () => {
        this.toast.ok('Rate deleted');
        this.load();
      },
      error: (err) => this.toast.error(errorMessage(err)),
    });
  }
}
