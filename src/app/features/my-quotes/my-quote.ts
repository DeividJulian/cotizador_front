import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';

import { ClientAnswer, QuoteOverview, quoteCode, statusLabel } from '../../core/models';
import { QuoteService } from '../../core/services/quote.service';
import { ToastService } from '../../core/services/toast.service';
import { cop, num } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { renderMarkdown } from '../../core/utils/markdown';
import { TabSyncService } from '../../core/workers/tab-sync.service';

/** Detalle de una cotización para el cliente: total, propuesta y botones para aceptar o rechazar. */
@Component({
  selector: 'app-my-quote',
  imports: [RouterLink],
  templateUrl: './my-quote.html',
})
export class MyQuote {
  /** Parámetro :id de la ruta (withComponentInputBinding) */
  readonly id = input.required<string>();

  private readonly quotes = inject(QuoteService);
  private readonly toast = inject(ToastService);
  private readonly sync = inject(TabSyncService);

  protected readonly cop = cop;
  protected readonly num = num;
  protected readonly code = quoteCode;
  protected readonly statusLabel = statusLabel;

  protected readonly overview = signal<QuoteOverview | null>(null);
  protected readonly proposal = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly html = computed(() => renderMarkdown(this.proposal() ?? ''));

  constructor() {
    effect(() => {
      const quoteId = Number(this.id());
      this.sync.remoteChanges();
      untracked(() => this.load(quoteId));
    });
  }

  protected load(quoteId = Number(this.id())): void {
    forkJoin({
      overview: this.quotes.overview(quoteId),
      proposal: this.quotes.proposal(quoteId).pipe(
        map((r) => r.propuesta),
        catchError(() => of(null)),
      ),
    }).subscribe({
      next: ({ overview, proposal }) => {
        this.overview.set(overview);
        this.proposal.set(proposal);
        this.error.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected answer(estado: ClientAnswer): void {
    const quote = this.overview();
    if (!quote) return;
    const question =
      estado === 'aceptada'
        ? `Accept the proposal "${quote.titulo}" for ${cop(quote.total)}? This cannot be undone.`
        : `Reject the proposal "${quote.titulo}"? This cannot be undone.`;
    if (!confirm(question)) return;

    this.busy.set(true);
    this.quotes.respond(quote.id, estado).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.overview.set(updated);
        this.toast.ok(estado === 'aceptada' ? 'Thank you! We received your acceptance.' : 'We registered that you rejected the proposal.');
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }

  protected download(): void {
    const text = this.proposal();
    const quote = this.overview();
    if (!text || !quote) return;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `proposal-${quoteCode(quote.id)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected print(): void {
    window.print();
  }
}
