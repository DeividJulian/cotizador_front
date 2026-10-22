import { Component, computed, inject, input, output, signal } from '@angular/core';

import { ProposalWording, Quote, SectionChange, quoteCode } from '../../core/models';
import { AiService, aiErrorMessage } from '../../core/services/ai.service';
import { QuoteService } from '../../core/services/quote.service';
import { ToastService } from '../../core/services/toast.service';
import { shortDate } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { renderMarkdown } from '../../core/utils/markdown';
import { AiPanel } from '../../shared/ai-panel/ai-panel';
import { Icon } from '../../shared/icon/icon';

/** Commercial proposal: generated from the quote data, read here and downloaded. */
@Component({
  selector: 'app-quote-proposal',
  imports: [AiPanel, Icon],
  templateUrl: './quote-proposal.html',
})
export class QuoteProposal {
  readonly quote = input.required<Quote>();
  readonly changed = output<void>();

  private readonly service = inject(QuoteService);
  private readonly ai = inject(AiService);
  private readonly toast = inject(ToastService);

  protected readonly code = quoteCode;
  protected readonly shortDate = shortDate;
  protected readonly busy = signal(false);
  protected readonly html = computed(() => renderMarkdown(this.quote().proposal ?? ''));
  protected readonly canGenerate = computed(() => this.quote().status === 'draft' && this.quote().items.length > 0);

  // Wording suggested by the AI: nothing changes until the user applies a section
  protected readonly improving = signal(false);
  protected readonly wording = signal<ProposalWording | null>(null);
  protected readonly wordingError = signal<string | null>(null);
  protected readonly applying = signal(false);
  protected readonly wordingBlocked = computed(() =>
    this.quote().status === 'draft' ? null : 'Vuelve a poner la cotización en borrador para cambiar la propuesta.',
  );

  protected generate(): void {
    this.busy.set(true);
    this.service.generateProposal(this.quote().id).subscribe({
      next: () => {
        this.busy.set(false);
        this.wording.set(null);
        this.toast.ai('Propuesta lista', 'Revísala antes de enviarla.');
        this.changed.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error('No se pudo generar la propuesta', errorMessage(err));
      },
    });
  }

  protected improve(): void {
    this.improving.set(true);
    this.wordingError.set(null);
    this.ai.improveProposal(this.quote().id).subscribe({
      next: (result) => {
        this.improving.set(false);
        this.wording.set(result);
      },
      error: (err) => {
        this.improving.set(false);
        this.wordingError.set(aiErrorMessage(err));
      },
    });
  }

  protected apply(sections: SectionChange[]): void {
    this.applying.set(true);
    this.service
      .updateProposalSections(this.quote().id, sections.map((s) => ({ heading: s.heading, text: s.improved })))
      .subscribe({
        next: () => {
          this.applying.set(false);
          this.dismiss(sections);
          this.toast.ok(sections.length === 1 ? 'Sección actualizada' : 'Secciones actualizadas', 'Las cifras quedaron iguales.');
          this.changed.emit();
        },
        error: (err) => {
          this.applying.set(false);
          this.toast.error('No se pudo aplicar la redacción', errorMessage(err));
        },
      });
  }

  /** Removes these sections from the suggestion list. */
  protected dismiss(sections: SectionChange[]): void {
    const result = this.wording();
    if (!result) return;
    const headings = sections.map((s) => s.heading);
    this.wording.set({ ...result, sections: result.sections.filter((s) => !headings.includes(s.heading)) });
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
