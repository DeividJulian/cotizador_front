import { Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { QuoteSummary, quoteCode, statusLabel } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { QuoteService } from '../../core/services/quote.service';
import { cop, shortDate } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { TabSyncService } from '../../core/workers/tab-sync.service';

/** Cotizaciones del cliente con sesión: el backend solo devuelve las suyas que ya le enviaron. */
@Component({
  selector: 'app-my-quotes',
  imports: [RouterLink],
  templateUrl: './my-quotes.html',
})
export class MyQuotes {
  private readonly quotes = inject(QuoteService);
  private readonly sync = inject(TabSyncService);
  protected readonly auth = inject(AuthService);

  protected readonly cop = cop;
  protected readonly shortDate = shortDate;
  protected readonly code = quoteCode;
  protected readonly statusLabel = statusLabel;

  protected readonly list = signal<QuoteSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.sync.remoteChanges();
      untracked(() => this.load());
    });
  }

  protected load(): void {
    this.quotes.list().subscribe({
      next: (list) => {
        this.list.set(list);
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
