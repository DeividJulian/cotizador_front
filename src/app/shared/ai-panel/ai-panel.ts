import { Component, OnInit, inject, input, output } from '@angular/core';

import { AiService } from '../../core/services/ai.service';
import { Icon } from '../icon/icon';

/**
 * Frame of every AI feature: title, provider reported by the server, the action button and the notices.
 * Without AI_API_KEY on the server the button is disabled and the panel says why.
 */
@Component({
  selector: 'app-ai-panel',
  imports: [Icon],
  template: `
    <section class="card ai-panel" [attr.aria-label]="title()">
      <div class="card__header">
        <div>
          <h2 class="card__title row" style="gap: 8px"><app-icon name="sparkles" />{{ title() }}</h2>
          <p class="card__subtitle">{{ subtitle() }}</p>
        </div>
        <div class="row">
          @if (ai.configured()) {
            <span class="ai-provider" [title]="'Modelo: ' + ai.status()!.model"><app-icon name="chip" size="sm" />Con {{ ai.providerLabel() }}</span>
          }
          <button class="btn btn--ai-soft btn--sm" type="button" (click)="run.emit()" [disabled]="!ai.configured() || busy() || !!disabledReason()"
            [title]="disabledReason() ?? ''">
            @if (busy()) { <span class="spinner spinner--ai"></span>Pensando… } @else { <app-icon name="sparkle" />{{ action() }} }
          </button>
        </div>
      </div>
      @if (ai.status() && !ai.configured()) {
        <div class="card__body">
          <div class="callout callout--neutral">
            <app-icon name="info" />
            <div><div class="callout__title">La IA no está configurada</div>El servidor no tiene AI_API_KEY. Todo lo demás funciona igual: los módulos, las horas y el precio los calcula el sistema.</div>
          </div>
        </div>
      } @else if (disabledReason() && !busy()) {
        <div class="card__body"><p class="hint">{{ disabledReason() }}</p></div>
      }
      @if (error(); as message) {
        <div class="card__body">
          <div class="callout callout--danger" role="alert">
            <app-icon name="warning" />
            <div><div class="callout__title">La IA no pudo responder</div>{{ message }}</div>
          </div>
        </div>
      }
      <ng-content />
    </section>
  `,
})
export class AiPanel implements OnInit {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly action = input('Preguntar a la IA');
  readonly busy = input(false);
  /** Why the action can't run now (e.g. the quote has no price yet) */
  readonly disabledReason = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly run = output<void>();

  protected readonly ai = inject(AiService);

  ngOnInit(): void {
    this.ai.loadStatus();
  }
}
