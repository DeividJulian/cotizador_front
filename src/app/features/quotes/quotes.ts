import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Client, QuoteStatus, QuoteSummary, STATUS_LABELS, quoteCode } from '../../core/models';
import { ClientService } from '../../core/services/client.service';
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
  private readonly clientsService = inject(ClientService);
  private readonly sync = inject(TabSyncService);

  protected readonly cop = cop;
  protected readonly shortDate = shortDate;
  protected readonly code = quoteCode;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statuses = Object.keys(STATUS_LABELS) as QuoteStatus[];

  protected readonly quotes = signal<QuoteSummary[]>([]);
  protected readonly clients = signal<Client[]>([]);
  protected readonly filter = signal<QuoteStatus | ''>('');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private readonly clientNames = computed(() => new Map(this.clients().map((c) => [c.id, c.empresa || c.nombre])));
  protected readonly total = computed(() => this.quotes().reduce((sum, q) => sum + q.total, 0));

  constructor() {
    effect(() => {
      this.sync.remoteChanges();
      const status = this.filter();
      untracked(() => this.load(status));
    });
  }

  protected clientName(id: number): string {
    return this.clientNames().get(id) ?? `Client #${id}`;
  }

  protected load(status: QuoteStatus | '' = this.filter()): void {
    forkJoin({ quotes: this.quotesService.list(status), clients: this.clientsService.list() }).subscribe({
      next: ({ quotes, clients }) => {
        this.quotes.set(quotes);
        this.clients.set(clients);
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
