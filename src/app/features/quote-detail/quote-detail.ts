import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  CROSS_CUTTING,
  NEXT_STATUSES,
  Quote,
  QuoteStatus,
  STATUSES,
  STATUS_LABELS,
  SimilarQuote,
  levelLabel,
  quoteCode,
} from '../../core/models';
import { QuoteService } from '../../core/services/quote.service';
import { ToastService } from '../../core/services/toast.service';
import { cop, num, shortDate } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { TabSyncService } from '../../core/workers/tab-sync.service';
import { Icon } from '../../shared/icon/icon';
import { AiPrice } from './ai-price';
import { AiQuestions } from './ai-questions';
import { AiScopeReview } from './ai-scope-review';
import { QuoteFinance } from './quote-finance';
import { QuoteItems } from './quote-items';
import { QuoteProposal } from './quote-proposal';
import { SimulationPanel } from './simulation-panel';

type Tab = 'modules' | 'finance' | 'risk' | 'proposal';

const FINAL_CONFIRM: Partial<Record<QuoteStatus, string>> = {
  accepted: '¿Marcar la cotización como aceptada? Es un estado final.',
  rejected: '¿Marcar la cotización como rechazada? Es un estado final.',
};

const STATUS_DONE: Record<QuoteStatus, string> = {
  draft: 'La cotización volvió a borrador',
  sent: 'Marcada como enviada',
  accepted: 'Marcada como aceptada',
  rejected: 'Marcada como rechazada',
};

@Component({
  selector: 'app-quote-detail',
  imports: [
    ReactiveFormsModule, RouterLink, Icon, QuoteItems, QuoteFinance, QuoteProposal, SimulationPanel,
    AiScopeReview, AiPrice, AiQuestions,
  ],
  templateUrl: './quote-detail.html',
})
export class QuoteDetail {
  /** :id route parameter (withComponentInputBinding) */
  readonly id = input.required<string>();

  private readonly quotes = inject(QuoteService);
  private readonly toast = inject(ToastService);
  private readonly sync = inject(TabSyncService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly cop = cop;
  protected readonly num = num;
  protected readonly shortDate = shortDate;
  protected readonly code = quoteCode;
  protected readonly level = levelLabel;
  protected readonly statuses = STATUSES;
  protected readonly statusLabels = STATUS_LABELS;

  protected readonly quote = signal<Quote | null>(null);
  protected readonly similar = signal<SimilarQuote[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly analyzing = signal(false);
  protected readonly tab = signal<Tab>('modules');
  protected readonly editing = signal(false);

  protected readonly isDraft = computed(() => this.quote()?.status === 'draft');
  protected readonly moduleCount = computed(() => (this.quote()?.items ?? []).filter((i) => i.category !== CROSS_CUTTING).length);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    client_name: ['', [Validators.maxLength(100)]],
    client_company: ['', [Validators.maxLength(100)]],
    scope_description: ['', [Validators.required, Validators.minLength(10)]],
    margin_pct: [30, [Validators.required, Validators.min(0), Validators.max(200)]],
    contingency_pct: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
    discount_pct: [0, [Validators.required, Validators.min(0), Validators.max(50)]],
    vat_pct: [19, [Validators.required, Validators.min(0), Validators.max(30)]],
  });

  constructor() {
    effect(() => {
      const quoteId = Number(this.id());
      this.sync.remoteChanges();
      untracked(() => this.load(quoteId));
    });
  }

  protected canMoveTo(status: QuoteStatus): boolean {
    const quote = this.quote();
    return !!quote && NEXT_STATUSES[quote.status].includes(status);
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

  /** Updates the screen with the quote returned by the server. */
  protected apply(quote: Quote): void {
    this.quote.set(quote);
    this.form.reset({
      title: quote.title,
      client_name: quote.client_name ?? '',
      client_company: quote.client_company ?? '',
      scope_description: quote.scope_description,
      margin_pct: quote.margin_pct,
      contingency_pct: quote.contingency_pct,
      discount_pct: quote.discount_pct,
      vat_pct: quote.vat_pct,
    });
  }

  protected analyze(): void {
    const quote = this.quote();
    if (!quote) return;
    if (quote.items.length && !confirm('Se analizará el alcance otra vez. Los módulos que ajustaste a mano se conservan. ¿Continuar?')) return;
    this.analyzing.set(true);
    this.quotes.analyze(quote.id).subscribe({
      next: (updated) => {
        this.analyzing.set(false);
        this.apply(updated);
        this.toast.ai('Análisis completo', 'Módulos, horas y precio actualizados.');
      },
      error: (err) => {
        this.analyzing.set(false);
        this.toast.error('No se pudo analizar', errorMessage(err));
      },
    });
  }

  protected saveDetails(): void {
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
        this.toast.ok('Cotización actualizada', 'El precio se recalculó.');
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error('No se pudieron guardar los cambios', errorMessage(err));
      },
    });
  }

  protected changeStatus(status: QuoteStatus): void {
    const quote = this.quote();
    if (!quote || status === quote.status || !this.canMoveTo(status)) return;
    const question = FINAL_CONFIRM[status];
    if (question && !confirm(question)) return;
    this.busy.set(true);
    this.quotes.setStatus(quote.id, status).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.apply(updated);
        this.toast.ok(STATUS_DONE[status], `${quoteCode(updated.id)} · ${cop(updated.total)}`);
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error('No se pudo cambiar el estado', errorMessage(err));
      },
    });
  }

  protected remove(): void {
    const quote = this.quote();
    if (!quote || !confirm(`¿Eliminar la cotización ${quoteCode(quote.id)}? No se puede deshacer.`)) return;
    this.quotes.remove(quote.id).subscribe({
      next: () => {
        this.toast.ok('Cotización eliminada');
        void this.router.navigate(['/cotizaciones']);
      },
      error: (err) => this.toast.error('No se pudo eliminar', errorMessage(err)),
    });
  }
}
