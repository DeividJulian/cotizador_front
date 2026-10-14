import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { STATUS_LABELS, Stats } from '../../core/models';
import { StatsService } from '../../core/services/stats.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/http-error';
import { cop, num } from '../../core/utils/format';
import { TabSyncService } from '../../core/workers/tab-sync.service';

const STATUS_ORDER = ['borrador', 'enviada', 'aceptada', 'rechazada'] as const;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly statsService = inject(StatsService);
  private readonly toast = inject(ToastService);
  private readonly sync = inject(TabSyncService);

  protected readonly cop = cop;
  protected readonly num = num;

  protected readonly stats = signal<Stats | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly loadingDemo = signal(false);

  protected readonly byStatus = computed(() => {
    const counts = this.stats()?.por_estado ?? {};
    const max = Math.max(1, ...STATUS_ORDER.map((s) => counts[s] ?? 0));
    return STATUS_ORDER.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: counts[status] ?? 0,
      width: ((counts[status] ?? 0) / max) * 100,
    }));
  });

  protected readonly hoursByRole = computed(() => {
    const entries = Object.entries(this.stats()?.horas_por_rol ?? {});
    const max = Math.max(1, ...entries.map(([, hours]) => hours));
    return entries.map(([role, hours]) => ({ role, hours, width: (hours / max) * 100 }));
  });

  constructor() {
    // Se ejecuta al abrir la página y cada vez que OTRA pestaña modifica datos (Shared Worker)
    effect(() => {
      this.sync.remoteChanges();
      untracked(() => this.load());
    });
  }

  protected load(): void {
    this.error.set(null);
    this.statsService.get().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected loadDemo(): void {
    const hasData = (this.stats()?.total_cotizaciones ?? 0) > 0;
    if (hasData && !confirm('There is already data. This DELETES everything and loads the demo data. Continue?')) return;

    this.loadingDemo.set(true);
    this.statsService.loadDemo(hasData).subscribe({
      next: () => {
        this.loadingDemo.set(false);
        this.toast.ok('Demo data loaded');
        this.load();
      },
      error: (err) => {
        this.loadingDemo.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }
}
