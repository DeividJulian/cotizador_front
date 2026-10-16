import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { QuoteStatus, QuoteSummary, STATUS_LABELS, quoteCode } from '../../core/models';
import { QuoteService } from '../../core/services/quote.service';
import { cop, shortDate } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { TabSyncService } from '../../core/workers/tab-sync.service';

@Component({
  selector: 'app-quotes',
  imports: [FormsModule, RouterLink],
  templateUrl: './quotes.html',
})
export class Quotes {
  private readonly quotesService = inject(QuoteService);
  private readonly sync = inject(TabSyncService);

  protected readonly cop = cop;
  protected readonly shortDate = shortDate;
  protected readonly code = quoteCode;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statuses = Object.keys(STATUS_LABELS) as QuoteStatus[];

  protected readonly quotes = signal<QuoteSummary[]>([]);
  protected readonly filter = signal<QuoteStatus | ''>('');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly total = computed(() => this.quotes().reduce((sum, q) => sum + q.total, 0));

  constructor() {
    effect(() => {
      this.sync.remoteChanges();
      const status = this.filter();
      untracked(() => this.load(status));
    });
  }

  /** Para quién es el proyecto (opcional). */
  protected forWhom(q: QuoteSummary): string {
    return [q.cliente_nombre, q.cliente_empresa].filter(Boolean).join(' · ') || '—';
  }

  protected load(status: QuoteStatus | '' = this.filter()): void {
    this.quotesService.list(status).subscribe({
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
