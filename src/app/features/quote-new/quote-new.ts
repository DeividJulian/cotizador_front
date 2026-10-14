import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Client, QuoteCreate, ScopeEstimate, levelLabel } from '../../core/models';
import { ClientService } from '../../core/services/client.service';
import { QuoteService } from '../../core/services/quote.service';
import { ScopeService } from '../../core/services/scope.service';
import { ToastService } from '../../core/services/toast.service';
import { num } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';

@Component({
  selector: 'app-quote-new',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './quote-new.html',
})
export class QuoteNew implements OnInit {
  private readonly clientsService = inject(ClientService);
  private readonly quotes = inject(QuoteService);
  private readonly scope = inject(ScopeService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly num = num;
  protected readonly level = levelLabel;

  protected readonly clients = signal<Client[]>([]);
  protected readonly loadingClients = signal(true);
  protected readonly preview = signal<ScopeEstimate | null>(null);
  protected readonly previewing = signal(false);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    cliente_id: [0, [Validators.required, Validators.min(1)]],
    titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    descripcion_alcance: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(20000)]],
    margen_pct: [30, [Validators.required, Validators.min(0), Validators.max(200)]],
    contingencia_pct: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
    descuento_pct: [0, [Validators.required, Validators.min(0), Validators.max(50)]],
    iva_pct: [19, [Validators.required, Validators.min(0), Validators.max(30)]],
  });

  ngOnInit(): void {
    this.clientsService.list().subscribe({
      next: (list) => {
        this.clients.set(list);
        this.loadingClients.set(false);
      },
      error: (err) => {
        this.loadingClients.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }

  /** Vista previa de la IA: detecta módulos y estima horas sin guardar nada. */
  protected runPreview(): void {
    const control = this.form.controls.descripcion_alcance;
    if (control.invalid) {
      control.markAsTouched();
      return;
    }
    this.previewing.set(true);
    this.scope.estimate(control.value).subscribe({
      next: (result) => {
        this.preview.set(result);
        this.previewing.set(false);
      },
      error: (err) => {
        this.preview.set(null);
        this.previewing.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }

  /** Crea la cotización y de una vez ejecuta el análisis de la IA. */
  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const input: QuoteCreate = { ...this.form.getRawValue() };
    input.titulo = input.titulo.trim();
    input.cliente_id = Number(input.cliente_id);
    this.saving.set(true);

    this.quotes.create(input).subscribe({
      next: (quote) => {
        this.quotes.analyze(quote.id).subscribe({
          next: () => {
            this.saving.set(false);
            this.toast.ok('Quote created and analyzed');
            void this.router.navigate(['/cotizaciones', quote.id]);
          },
          error: (err) => {
            this.saving.set(false);
            this.toast.error(`The quote was created, but the analysis failed: ${errorMessage(err)}`);
            void this.router.navigate(['/cotizaciones', quote.id]);
          },
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }
}
