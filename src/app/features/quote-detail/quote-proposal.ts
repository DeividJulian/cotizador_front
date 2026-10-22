import { Component, computed, inject, input, output, signal } from '@angular/core';

import { Quote, quoteCode } from '../../core/models';
import { QuoteService } from '../../core/services/quote.service';
import { ToastService } from '../../core/services/toast.service';
import { shortDate } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { renderMarkdown } from '../../core/utils/markdown';
import { Icon } from '../../shared/icon/icon';

/** Commercial proposal: generated from the quote data, read here and downloaded. */
@Component({
  selector: 'app-quote-proposal',
  imports: [Icon],
  templateUrl: './quote-proposal.html',
})
export class QuoteProposal {
  readonly quote = input.required<Quote>();
  readonly changed = output<void>();

  private readonly service = inject(QuoteService);
  private readonly toast = inject(ToastService);

  protected readonly code = quoteCode;
  protected readonly shortDate = shortDate;
  protected readonly busy = signal(false);
  protected readonly html = computed(() => renderMarkdown(this.quote().proposal ?? ''));
  protected readonly canGenerate = computed(() => this.quote().status === 'draft' && this.quote().items.length > 0);

  protected generate(): void {
    this.busy.set(true);
    this.service.generateProposal(this.quote().id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.ai('Propuesta lista', 'Revísala antes de enviarla.');
        this.changed.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error('No se pudo generar la propuesta', errorMessage(err));
      },
    });
  }

  protected download(): void {
    const text = this.quote().proposal;
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `propuesta-${quoteCode(this.quote().id)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected print(): void {
    window.print();
  }
}
