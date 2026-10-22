import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { QuoteStatus, QuoteSummary, STATUSES, STATUS_LABELS, quoteCode } from '../../core/models';
import { QuoteService } from '../../core/services/quote.service';
import { cop, shortDate } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { TabSyncService } from '../../core/workers/tab-sync.service';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-quotes',
  imports: [RouterLink, Icon],
  templateUrl: './quotes.html',
})
export class Quotes {
  private readonly quotesService = inject(QuoteService);
  private readonly sync = inject(TabSyncService);
  private readonly router = inject(Router);

  protected readonly cop = cop;
  protected readonly shortDate = shortDate;
  protected readonly code = quoteCode;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statuses = STATUSES;
  protected readonly emptyLabels: Record<QuoteStatus, string> = {
    draft: 'en borrador',
    sent: 'enviadas',
    accepted: 'aceptadas',
    rejected: 'rechazadas',
  };

  /** All the user's quotes: the filter works on the client so every tab can show its count. */
  protected readonly quotes = signal<QuoteSummary[]>([]);
  protected readonly filter = signal<QuoteStatus | ''>('');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly visible = computed(() => {
    const status = this.filter();
    return status ? this.quotes().filter((q) => q.status === status) : this.quotes();
  });

  protected readonly counts = computed(() => {
    const counts: Partial<Record<QuoteStatus, number>> = {};
    for (const q of this.quotes()) counts[q.status] = (counts[q.status] ?? 0) + 1;
    return counts;
  });

  constructor() {
    effect(() => {
      this.sync.remoteChanges();
      untracked(() => this.load());
    });
  }

  protected open(id: number): void {
    void this.router.navigate(['/cotizaciones', id]);
  }

  protected load(): void {
    this.quotesService.list().subscribe({
      next: (quotes) => {
        this.quotes.set(quotes);
        this.error.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
