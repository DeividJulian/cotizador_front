import { Component, inject, input, signal } from '@angular/core';

import { ClientQuestions, Quote } from '../../core/models';
import { AiService, aiErrorMessage } from '../../core/services/ai.service';
import { AiPanel } from '../../shared/ai-panel/ai-panel';

/** Questions to ask the client and risks that could add hours, before sending the quote. */
@Component({
  selector: 'app-ai-questions',
  imports: [AiPanel],
  template: `
    <app-ai-panel
      title="Preguntas y riesgos para el cliente"
      subtitle="Lo que conviene aclarar en la reunión antes de enviar la cotización, para evitar sorpresas."
      action="Preparar preguntas"
      [busy]="busy()"
      [error]="error()"
      (run)="ask()">
      @if (result(); as r) {
        <div class="card__body grid grid--2">
          <div>
            <p class="label">Preguntas</p>
            <ol class="ai-list">@for (q of r.questions; track q) { <li>{{ q }}</li> }</ol>
          </div>
          <div>
            <p class="label">Riesgos</p>
            @if (r.risks.length === 0) {
              <p class="small subtle">No encontró riesgos importantes.</p>
            } @else {
              <ul class="ai-list">
                @for (risk of r.risks; track risk.risk) {
                  <li><span class="strong">{{ risk.risk }}</span>@if (risk.mitigation) { <br /><span class="subtle">Cómo evitarlo: {{ risk.mitigation }}</span> }</li>
                }
              </ul>
            }
          </div>
        </div>
      }
    </app-ai-panel>
  `,
})
export class AiQuestions {
  readonly quote = input.required<Quote>();

  private readonly ai = inject(AiService);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<ClientQuestions | null>(null);

  protected ask(): void {
    this.busy.set(true);
    this.error.set(null);
    this.ai.clientQuestions(this.quote().id).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.result.set(result);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(aiErrorMessage(err));
      },
    });
  }
}
