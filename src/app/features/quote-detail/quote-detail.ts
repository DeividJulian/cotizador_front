import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  NEXT_STATUSES,
  Quote,
  QuoteStatus,
  SimilarQuote,
  levelLabel,
  quoteCode,
  statusLabel,
} from '../../core/models';
import { QuoteService } from '../../core/services/quote.service';
import { ToastService } from '../../core/services/toast.service';
import { cop, num } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { TabSyncService } from '../../core/workers/tab-sync.service';
import { QuoteFinance } from './quote-finance';
import { QuoteItems } from './quote-items';
import { QuoteProposal } from './quote-proposal';
import { SimulationPanel } from './simulation-panel';

type Tab = 'modulos' | 'finanzas' | 'riesgo' | 'propuesta';

const STATUS_ACTIONS: Record<QuoteStatus, string> = {
  enviada: 'Mark as sent',
  borrador: 'Back to draft',
  aceptada: 'Accepted',
  rechazada: 'Rejected',
};

@Component({
  selector: 'app-quote-detail',
  imports: [ReactiveFormsModule, RouterLink, QuoteItems, QuoteFinance, QuoteProposal, SimulationPanel],
  templateUrl: './quote-detail.html',
})
export class QuoteDetail {
  /** Parámetro :id de la ruta (withComponentInputBinding) */
  readonly id = input.required<string>();

  private readonly quotes = inject(QuoteService);
  private readonly toast = inject(ToastService);
  private readonly sync = inject(TabSyncService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly cop = cop;
  protected readonly num = num;
  protected readonly code = quoteCode;
  protected readonly statusLabel = statusLabel;
  protected readonly level = levelLabel;
  protected readonly next = NEXT_STATUSES;
  protected readonly actions = STATUS_ACTIONS;

  protected readonly quote = signal<Quote | null>(null);
  protected readonly similar = signal<SimilarQuote[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly tab = signal<Tab>('modulos');
  protected readonly editing = signal(false);

  protected readonly isDraft = computed(() => this.quote()?.estado === 'borrador');

  protected readonly form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    cliente_nombre: ['', [Validators.maxLength(100)]],
    cliente_empresa: ['', [Validators.maxLength(100)]],
    descripcion_alcance: ['', [Validators.required, Validators.minLength(10)]],
    margen_pct: [30, [Validators.required, Validators.min(0), Validators.max(200)]],
    contingencia_pct: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
    descuento_pct: [0, [Validators.required, Validators.min(0), Validators.max(50)]],
    iva_pct: [19, [Validators.required, Validators.min(0), Validators.max(30)]],
  });

  constructor() {
    effect(() => {
      const quoteId = Number(this.id());
      this.sync.remoteChanges();
      untracked(() => this.load(quoteId));
    });
  }

  protected load(quoteId = Number(this.id())): void {
    this.quotes.get(quoteId).subscribe({
      next: (quote) => {
        this.apply(quote);
        this.error.set(null);
        this.loading.set(false);
        this.quotes
          .similar(quote.id)
          .pipe(catchError(() => of([] as SimilarQuote[])))
          .subscribe((similar) => this.similar.set(similar));
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected forWhom(quote: Quote): string {
    const who = [quote.cliente_nombre, quote.cliente_empresa].filter(Boolean).join(' · ');
    return who ? `For ${who}` : 'Your project';
  }

  /** Actualiza la pantalla con la cotización que devolvió el servidor. */
  protected apply(quote: Quote): void {
    this.quote.set(quote);
    this.form.reset({
      titulo: quote.titulo,
      cliente_nombre: quote.cliente_nombre ?? '',
      cliente_empresa: quote.cliente_empresa ?? '',
      descripcion_alcance: quote.descripcion_alcance,
      margen_pct: quote.margen_pct,
      contingencia_pct: quote.contingencia_pct,
      descuento_pct: quote.descuento_pct,
      iva_pct: quote.iva_pct,
    });
  }

  protected analyze(): void {
    const quote = this.quote();
    if (!quote) return;
    if (quote.items.length && !confirm('The scope will be analyzed again. Manually adjusted modules are kept. Continue?')) return;
    this.busy.set(true);
    this.quotes.analyze(quote.id).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.apply(updated);
        this.toast.ok('Analysis complete: modules, hours and price updated');
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }

  protected saveParams(): void {
    const quote = this.quote();
    if (!quote) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.quotes.update(quote.id, this.form.getRawValue()).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.editing.set(false);
        this.apply(updated);
        this.toast.ok('Quote updated and price recalculated');
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }

  protected changeStatus(status: QuoteStatus): void {
    const quote = this.quote();
    if (!quote) return;
    if (status === 'rechazada' && !confirm('Mark the quote as rejected? It is a final state.')) return;
    if (status === 'aceptada' && !confirm('Mark the quote as accepted? It is a final state.')) return;
    this.busy.set(true);
    this.quotes.setStatus(quote.id, status).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.apply(updated);
        this.toast.ok(`Quote ${statusLabel(status).toLowerCase()}`);
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }

  protected remove(): void {
    const quote = this.quote();
    if (!quote || !confirm(`Delete quote ${quoteCode(quote.id)}?`)) return;
    this.quotes.remove(quote.id).subscribe({
      next: () => {
        this.toast.ok('Quote deleted');
        void this.router.navigate(['/cotizaciones']);
      },
      error: (err) => this.toast.error(errorMessage(err)),
    });
  }
}
