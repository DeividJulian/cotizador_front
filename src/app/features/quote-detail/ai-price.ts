import { Component, computed, inject, input, signal } from '@angular/core';

import { PriceExplanation, Quote } from '../../core/models';
import { AiService, aiErrorMessage } from '../../core/services/ai.service';
import { AiPanel } from '../../shared/ai-panel/ai-panel';

/** The AI explains, in plain words, the price our code calculated. It never changes a number. */
@Component({
  selector: 'app-ai-price',
  imports: [AiPanel],
  template: `
    <app-ai-panel
      title="Explícame el precio"
      subtitle="Una explicación en palabras sencillas de las cifras de arriba, para que puedas defender tu precio."
      action="Explicar el precio"
      [busy]="busy()"
      [error]="error()"
      [disabledReason]="disabledReason()"
      (run)="explain()">
      @if (result(); as r) {
        <div class="card__body stack">
          <p>{{ r.summary }}</p>
          @if (r.drivers.length) {
            <div>
              <p class="label">Lo que más pesa</p>
              <ul class="ai-list">@for (d of r.drivers; track d) { <li>{{ d }}</li> }</ul>
            </div>
          }
          @if (r.ways_to_lower.length) {
            <div>
              <p class="label">Si el cliente necesita un precio menor</p>
              <ul class="ai-list">@for (w of r.ways_to_lower; track w) { <li>{{ w }}</li> }</ul>
            </div>
          }
          <p class="hint">Las cifras las calcula el sistema; la IA solo las explica.</p>
        </div>
      }
    </app-ai-panel>
  `,
})
export class AiPrice {
  readonly quote = input.required<Quote>();

  private readonly ai = inject(AiService);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<PriceExplanation | null>(null);
  protected readonly disabledReason = computed(() =>
    this.quote().total ? null : 'Analiza la cotización para tener un precio que explicar.',
  );

  protected explain(): void {
    this.busy.set(true);
    this.error.set(null);
    this.ai.explainPrice(this.quote().id).subscribe({
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
