import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Rate, RateInput } from '../../core/models';
import { RateService } from '../../core/services/rate.service';
import { ToastService } from '../../core/services/toast.service';
import { cop, roleColor } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { TabSyncService } from '../../core/workers/tab-sync.service';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-rates',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './rates.html',
})
export class Rates {
  private readonly service = inject(RateService);
  private readonly toast = inject(ToastService);
  private readonly sync = inject(TabSyncService);
  private readonly fb = inject(FormBuilder);

  protected readonly cop = cop;
  protected readonly roleColor = roleColor;

  protected readonly rates = signal<Rate[]>([]);
  /** Market reference per role, to compare with what the user charges */
  protected readonly market = signal<Record<string, number>>({});
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly resetting = signal(false);

  protected readonly countLabel = computed(() => {
    const n = this.rates().length;
    return `${n} ${n === 1 ? 'rol' : 'roles'} · COP`;
  });

  protected readonly addForm = this.fb.nonNullable.group({
    role: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    hourly_rate: [null as number | null, [Validators.required, Validators.min(1), Validators.max(2_000_000)]],
  });

  protected readonly editForm = this.fb.nonNullable.group({
    hourly_rate: [0, [Validators.required, Validators.min(1), Validators.max(2_000_000)]],
  });

  constructor() {
    effect(() => {
      this.sync.remoteChanges();
      untracked(() => this.load());
    });
    this.service
      .market()
      .pipe(catchError(() => of([] as RateInput[])))
      .subscribe((list) => this.market.set(Object.fromEntries(list.map((r) => [r.role, r.hourly_rate]))));
  }

  protected load(): void {
    this.service.list().subscribe({
      next: (list) => {
        this.rates.set(list);
        this.error.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected add(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const v = this.addForm.getRawValue();
    const input = { role: v.role.trim(), hourly_rate: Number(v.hourly_rate) };
    this.saving.set(true);
    this.service.create(input).subscribe({
      next: () => {
        this.saving.set(false);
        this.addForm.reset({ role: '', hourly_rate: null });
        this.toast.ok('Tarifa agregada', `${input.role} · ${cop(input.hourly_rate)} por hora.`);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('No se pudo agregar la tarifa', errorMessage(err));
      },
    });
  }

  protected edit(rate: Rate): void {
    this.editingId.set(rate.id);
    this.editForm.reset({ hourly_rate: rate.hourly_rate });
  }

  protected cancel(): void {
    this.editingId.set(null);
  }

  protected save(rate: Rate): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const hourly_rate = Number(this.editForm.getRawValue().hourly_rate);
    this.saving.set(true);
    this.service.update(rate.id, { role: rate.role, hourly_rate }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editingId.set(null);
        this.toast.ok('Tarifa guardada', `${rate.role} · ${cop(hourly_rate)} por hora.`);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('No se pudo guardar la tarifa', errorMessage(err));
      },
    });
  }

  protected resetToMarket(): void {
    if (this.rates().length && !confirm('¿Reemplazar todas tus tarifas por las de referencia del mercado?')) return;
    this.resetting.set(true);
    this.service.resetToMarket().subscribe({
      next: (list) => {
        this.resetting.set(false);
        this.rates.set(list);
        this.editingId.set(null);
        this.toast.ok('Tarifas del mercado restauradas', 'Las cotizaciones nuevas usarán estos valores.');
      },
      error: (err) => {
        this.resetting.set(false);
        this.toast.error('No se pudieron restaurar las tarifas', errorMessage(err));
      },
    });
  }

  protected remove(rate: Rate): void {
    if (!confirm(`¿Eliminar la tarifa de ${rate.role}?`)) return;
    this.service.remove(rate.id).subscribe({
      next: () => {
        this.toast.ok('Tarifa eliminada', rate.role);
        this.load();
      },
      error: (err) => this.toast.error('No se pudo eliminar la tarifa', errorMessage(err)),
    });
  }
}
