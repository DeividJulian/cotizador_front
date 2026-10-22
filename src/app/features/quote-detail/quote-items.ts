import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CROSS_CUTTING, CUSTOM, Complexity, ItemUpdate, Quote, QuoteItem, levelLabel } from '../../core/models';
import { QuoteService } from '../../core/services/quote.service';
import { ToastService } from '../../core/services/toast.service';
import { num, roleColor } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { Icon } from '../../shared/icon/icon';

/** Modules of the quote: while it is a draft they can be adjusted, removed and added. */
@Component({
  selector: 'app-quote-items',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './quote-items.html',
})
export class QuoteItems {
  readonly quote = input.required<Quote>();
  readonly changed = output<Quote>();

  private readonly service = inject(QuoteService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly num = num;
  protected readonly level = levelLabel;
  protected readonly roleColor = roleColor;
  protected readonly crossCutting = CROSS_CUTTING;
  protected readonly complexities: Complexity[] = ['low', 'medium', 'high'];
  protected readonly renamingId = signal<number | null>(null);
  protected readonly adding = signal(false);
  protected readonly busy = signal(false);

  protected readonly editable = computed(() => this.quote().status === 'draft');
  protected readonly totals = computed(() => {
    const items = this.quote().items;
    const sum = (pick: (i: QuoteItem) => number) => items.reduce((acc, i) => acc + pick(i), 0);
    return {
      optimistic: sum((i) => i.hours_optimistic),
      likely: sum((i) => i.hours_likely),
      pessimistic: sum((i) => i.hours_pessimistic),
      expected: sum((i) => i.hours_expected),
    };
  });

  protected readonly renameForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
  });

  protected readonly addForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    complexity: ['medium' as Complexity],
    hours_likely: [8, [Validators.required, Validators.min(0.5), Validators.max(5000)]],
  });

  protected roles(item: QuoteItem): { role: string; pct: number }[] {
    return Object.entries(item.split)
      .map(([role, share]) => ({ role, pct: Math.round(share * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }

  /** Saves the most likely hours when the cell loses focus or Enter is pressed. */
  protected saveHours(item: QuoteItem, field: HTMLInputElement): void {
    const hours = Number(field.value);
    if (hours === item.hours_likely) return;
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 5000) {
      field.value = String(item.hours_likely);
      this.toast.error('Horas inválidas', 'Escribe un número entre 0,5 y 5.000.');
      return;
    }
    this.update(item, { hours_likely: hours }, `«${item.name}»: ${num(hours)} h más probables`, () => (field.value = String(item.hours_likely)));
  }

  protected saveComplexity(item: QuoteItem, field: HTMLSelectElement): void {
    const value = field.value as Complexity;
    if (value === item.complexity) return;
    this.update(item, { complexity: value }, `«${item.name}»: complejidad ${levelLabel(value).toLowerCase()}`, () => (field.value = item.complexity));
  }

  protected startRename(item: QuoteItem): void {
    this.renamingId.set(item.id);
    this.renameForm.reset({ name: item.name });
  }

  protected saveRename(item: QuoteItem): void {
    if (this.renameForm.invalid) {
      this.renameForm.markAllAsTouched();
      return;
    }
    const name = this.renameForm.getRawValue().name.trim();
    if (name === item.name) {
      this.renamingId.set(null);
      return;
    }
    this.update(item, { name }, 'Módulo renombrado');
  }

  protected remove(item: QuoteItem): void {
    if (!confirm(`¿Quitar «${item.name}» de la cotización?`)) return;
    this.busy.set(true);
    this.service.removeItem(this.quote().id, item.id).subscribe({
      next: (quote) => this.done(quote, 'Módulo eliminado', 'El precio se recalculó.'),
      error: (err) => this.fail(err),
    });
  }

  protected add(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const v = this.addForm.getRawValue();
    this.busy.set(true);
    this.service
      .addItem(this.quote().id, { name: v.name.trim(), category: CUSTOM, complexity: v.complexity, hours_likely: Number(v.hours_likely) })
      .subscribe({
        next: (quote) => {
          this.adding.set(false);
          this.addForm.reset({ name: '', complexity: 'medium', hours_likely: 8 });
          this.done(quote, 'Módulo agregado', 'El precio se recalculó.');
        },
        error: (err) => this.fail(err),
      });
  }

  /** `undo` puts the cell back to the saved value when the server rejects the change. */
  private update(item: QuoteItem, changes: ItemUpdate, message: string, undo?: () => void): void {
    this.busy.set(true);
    this.service.updateItem(this.quote().id, item.id, changes).subscribe({
      next: (quote) => this.done(quote, message, 'El precio se recalculó.'),
      error: (err) => {
        undo?.();
        this.fail(err);
      },
    });
  }

  private done(quote: Quote, title: string, text?: string): void {
    this.busy.set(false);
    this.renamingId.set(null);
    this.toast.ok(title, text);
    this.changed.emit(quote);
  }

  private fail(err: unknown): void {
    this.busy.set(false);
    this.toast.error('No se pudo guardar el cambio', errorMessage(err));
  }
}
