import { Component, computed, inject, input, output, signal } from '@angular/core';

import { ModuleSuggestion, Quote, ScopeReview } from '../../core/models';
import { AiService, aiErrorMessage } from '../../core/services/ai.service';
import { QuoteService } from '../../core/services/quote.service';
import { ToastService } from '../../core/services/toast.service';
import { num } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { AiPanel } from '../../shared/ai-panel/ai-panel';
import { Icon } from '../../shared/icon/icon';

/** AI second opinion: catalog modules the description asks for and the analysis missed. */
@Component({
  selector: 'app-ai-scope-review',
  imports: [AiPanel, Icon],
  template: `
    <app-ai-panel
      title="Segunda opinión del alcance"
      subtitle="La IA relee tu descripción y sugiere módulos del catálogo que el análisis pudo pasar por alto. Tú decides si los agregas."
      action="Revisar el alcance"
      [busy]="busy()"
      [error]="error()"
      (run)="review()">
      @if (result(); as r) {
        <div class="card__body stack">
          @if (pending().length === 0) {
            <p class="small">No encontró módulos que falten: el análisis cubre lo que describiste.</p>
          } @else {
            <ul class="module-list">
              @for (s of pending(); track s.key) {
                <li class="module-item">
                  <div>
                    <span class="module-item__name">{{ s.name }}</span>
                    <span class="module-item__meta">{{ s.category }} · {{ s.reason }}</span>
                  </div>
                  <span class="row" style="flex-wrap: nowrap">
                    <span class="module-item__hours">{{ num(s.hours_likely) }} h</span>
                    <button class="btn btn--secondary btn--sm" type="button" (click)="add(s)" [disabled]="!editable() || adding() !== null"
                      [title]="editable() ? '' : 'Solo se agregan módulos a una cotización en borrador'">
                      @if (adding() === s.key) { <span class="spinner"></span> } @else { <app-icon name="plus" /> }Agregar
                    </button>
                  </span>
                </li>
              }
            </ul>
          }
          @if (r.missing_details.length) {
            <div>
              <p class="label">Datos que conviene pedirle al cliente</p>
              <ul class="ai-list">
                @for (d of r.missing_details; track d) { <li>{{ d }}</li> }
              </ul>
            </div>
          }
          <p class="hint">Las horas de cada sugerencia son las del catálogo; al agregarla, el sistema recalcula el precio.</p>
        </div>
      }
    </app-ai-panel>
  `,
})
export class AiScopeReview {
  readonly quote = input.required<Quote>();
  readonly changed = output<Quote>();

  private readonly ai = inject(AiService);
  private readonly quotes = inject(QuoteService);
  private readonly toast = inject(ToastService);

  protected readonly num = num;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<ScopeReview | null>(null);
  protected readonly adding = signal<string | null>(null);
  private readonly added = signal<string[]>([]);

  protected readonly editable = computed(() => this.quote().status === 'draft');
  protected readonly pending = computed(() => (this.result()?.suggestions ?? []).filter((s) => !this.added().includes(s.key)));

  protected review(): void {
    this.busy.set(true);
    this.error.set(null);
    this.ai.scopeReview(this.quote().id).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.added.set([]);
        this.result.set(result);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(aiErrorMessage(err));
      },
    });
  }

  protected add(s: ModuleSuggestion): void {
    this.adding.set(s.key);
    this.quotes
      .addItem(this.quote().id, { name: s.name, category: s.category, complexity: 'medium', hours_likely: s.hours_likely, split: s.split })
      .subscribe({
        next: (quote) => {
          this.adding.set(null);
          this.added.update((keys) => [...keys, s.key]);
          this.toast.ok('Módulo agregado', `${s.name} · el precio se recalculó.`);
          this.changed.emit(quote);
        },
        error: (err) => {
          this.adding.set(null);
          this.toast.error('No se pudo agregar el módulo', errorMessage(err));
        },
      });
  }
}
