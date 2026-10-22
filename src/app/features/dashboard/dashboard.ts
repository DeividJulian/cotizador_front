import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { STATUSES, STATUS_LABELS, Stats } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { StatsService } from '../../core/services/stats.service';
import { ToastService } from '../../core/services/toast.service';
import { cop, num, roleColor } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { TabSyncService } from '../../core/workers/tab-sync.service';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Icon],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly statsService = inject(StatsService);
  private readonly toast = inject(ToastService);
  private readonly sync = inject(TabSyncService);
  protected readonly auth = inject(AuthService);

  protected readonly cop = cop;
  protected readonly num = num;
  protected readonly roleColor = roleColor;

  protected readonly stats = signal<Stats | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly loadingExamples = signal(false);

  protected readonly firstName = computed(() => (this.auth.user()?.name ?? '').split(' ')[0]);

  protected readonly byStatus = computed(() => {
    const counts = this.stats()?.by_status ?? {};
    const max = Math.max(1, ...STATUSES.map((s) => counts[s] ?? 0));
    return STATUSES.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: counts[status] ?? 0,
      width: ((counts[status] ?? 0) / max) * 100,
    }));
  });

  protected readonly hoursByRole = computed(() => {
    const entries = Object.entries(this.stats()?.hours_by_role ?? {}).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(([, hours]) => hours));
    return entries.map(([role, hours]) => ({ role, hours, width: (hours / max) * 100 }));
  });

  protected readonly totalHours = computed(() => this.hoursByRole().reduce((n, r) => n + r.hours, 0));
  protected readonly waiting = computed(() => this.stats()?.by_status['sent'] ?? 0);
  protected readonly decided = computed(() => {
    const s = this.stats()?.by_status ?? {};
    return { accepted: s['accepted'] ?? 0, total: (s['accepted'] ?? 0) + (s['rejected'] ?? 0) };
  });

  constructor() {
    // Runs when the page opens and every time ANOTHER tab changes data (Shared Worker)
    effect(() => {
      this.sync.remoteChanges();
      untracked(() => this.load());
    });
  }

  protected appearsIn(count: number): number {
    const total = this.stats()?.total_quotes ?? 0;
    return total ? Math.round((count / total) * 100) : 0;
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

  protected loadExamples(): void {
    const hasData = (this.stats()?.total_quotes ?? 0) > 0;
    if (hasData && !confirm('Ya tienes cotizaciones. Esto BORRA todas tus cotizaciones y carga los ejemplos. ¿Continuar?')) return;

    this.loadingExamples.set(true);
    this.statsService.loadExamples(hasData).subscribe({
      next: () => {
        this.loadingExamples.set(false);
        this.toast.ok('Ejemplos cargados', 'Abre una cotización para ver cómo funciona.');
        this.load();
      },
      error: (err) => {
        this.loadingExamples.set(false);
        this.toast.error('No se pudieron cargar los ejemplos', errorMessage(err));
      },
    });
  }
}
