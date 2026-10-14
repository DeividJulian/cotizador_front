import { Component, computed, inject, input, output, signal } from '@angular/core';

import { Quote, quoteCode } from '../../core/models';
import { QuoteService } from '../../core/services/quote.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/http-error';
import { renderMarkdown } from '../../core/utils/markdown';

/** Propuesta comercial: se genera con los datos de la cotización, se lee aquí y se descarga. */
@Component({
  selector: 'app-quote-proposal',
  templateUrl: './quote-proposal.html',
})
export class QuoteProposal {
  readonly quote = input.required<Quote>();
  readonly changed = output<void>();

  private readonly service = inject(QuoteService);
  private readonly toast = inject(ToastService);

  protected readonly busy = signal(false);
  protected readonly html = computed(() => renderMarkdown(this.quote().propuesta ?? ''));

  protected get canGenerate(): boolean {
    return this.quote().estado === 'borrador' && this.quote().items.length > 0;
  }

  protected generate(): void {
    this.busy.set(true);
    this.service.generateProposal(this.quote().id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.ok('Proposal generated');
        this.changed.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }

  protected download(): void {
    const text = this.quote().propuesta;
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `proposal-${quoteCode(this.quote().id)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected print(): void {
    window.print();
  }
}
