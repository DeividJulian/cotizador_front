import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Complexity, Quote, QuoteItem, levelLabel } from '../../core/models';
import { QuoteService } from '../../core/services/quote.service';
import { ToastService } from '../../core/services/toast.service';
import { num } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';

/** Tabla de módulos de la cotización: se pueden ajustar, quitar y agregar mientras sea borrador. */
@Component({
  selector: 'app-quote-items',
  imports: [ReactiveFormsModule],
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
  protected readonly complexities: Complexity[] = ['baja', 'media', 'alta'];
  protected readonly editingId = signal<number | null>(null);
  protected readonly adding = signal(false);
  protected readonly busy = signal(false);

  protected readonly editForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    complejidad: ['media' as Complexity],
    horas_probable: [1, [Validators.required, Validators.min(0.5), Validators.max(5000)]],
  });

  protected readonly addForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    complejidad: ['media' as Complexity],
    horas_probable: [8, [Validators.required, Validators.min(0.5), Validators.max(5000)]],
  });

  protected get editable(): boolean {
    return this.quote().estado === 'borrador';
  }

  protected roles(item: QuoteItem): { role: string; pct: number }[] {
    return Object.entries(item.distribucion).map(([role, share]) => ({ role, pct: Math.round(share * 100) }));
  }

  protected startEdit(item: QuoteItem): void {
    this.editingId.set(item.id);
    this.editForm.reset({ nombre: item.nombre, complejidad: item.complejidad, horas_probable: item.horas_probable });
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected saveEdit(item: QuoteItem): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.getRawValue();
    this.busy.set(true);
    this.service
      .updateItem(this.quote().id, item.id, {
        nombre: v.nombre.trim(),
        complejidad: v.complejidad,
        horas_probable: Number(v.horas_probable),
      })
      .subscribe({
        next: (quote) => this.done(quote, 'Module adjusted and price recalculated'),
        error: (err) => this.fail(err),
      });
  }

  protected remove(item: QuoteItem): void {
    if (!confirm(`Remove "${item.nombre}" from the quote?`)) return;
    this.busy.set(true);
    this.service.removeItem(this.quote().id, item.id).subscribe({
      next: (quote) => this.done(quote, 'Module removed and price recalculated'),
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
      .addItem(this.quote().id, {
        nombre: v.nombre.trim(),
        categoria: 'Custom',
        complejidad: v.complejidad,
        horas_probable: Number(v.horas_probable),
      })
      .subscribe({
        next: (quote) => {
          this.adding.set(false);
          this.addForm.reset({ nombre: '', complejidad: 'media', horas_probable: 8 });
          this.done(quote, 'Module added and price recalculated');
        },
        error: (err) => this.fail(err),
      });
  }

  private done(quote: Quote, message: string): void {
    this.busy.set(false);
    this.editingId.set(null);
    this.toast.ok(message);
    this.changed.emit(quote);
  }

  private fail(err: unknown): void {
    this.busy.set(false);
    this.toast.error(errorMessage(err));
  }
}
