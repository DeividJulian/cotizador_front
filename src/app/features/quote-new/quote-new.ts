import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';

import { CROSS_CUTTING, Financials, QuoteCreate, ScopeEstimate, levelLabel } from '../../core/models';
import { QuoteService } from '../../core/services/quote.service';
import { ScopeService } from '../../core/services/scope.service';
import { ToastService } from '../../core/services/toast.service';
import { cop, num } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/http-error';
import { Icon } from '../../shared/icon/icon';

type Step = 1 | 2 | 3;

/** What makes a description good. Each tip is met when its words show up in the text (without accents). */
const TIPS = [
  { label: 'Quién lo usa', example: 'clientes, administrador', pattern: /usuari|client|administr|empleado|doctor|estudiante|user|admin/ },
  { label: 'Funciones principales', example: 'catálogo, carrito, panel', pattern: null },
  { label: 'Pagos e integraciones', example: 'PSE, tarjeta, correo', pattern: /pago|pse|tarjeta|integr|api|correo|whatsapp|factur|payment|email/ },
  { label: 'Plataformas', example: 'web, celular', pattern: /web|celular|movil|app|android|ios|mobile|escritorio/ },
  { label: 'Tamaño y volumen', example: '¿cuántos productos? ¿cuántos pedidos al día?', pattern: /\d+|cientos|miles|muchos|pocos|hundreds|thousands/ },
  { label: 'Qué queda por fuera', example: '"no incluye app nativa"', pattern: /no incluye|no se incluye|fuera del alcance|no requiere|no necesita|out of scope/ },
];

const CONFIDENCE_WIDTH: Partial<Record<string, number>> = { low: 35, medium: 65, high: 92 };

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

@Component({
  selector: 'app-quote-new',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './quote-new.html',
})
export class QuoteNew {
  private readonly quotes = inject(QuoteService);
  private readonly scope = inject(ScopeService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cop = cop;
  protected readonly num = num;
  protected readonly level = levelLabel;
  protected readonly confidenceWidth = CONFIDENCE_WIDTH;

  protected readonly step = signal<Step>(1);
  protected readonly preview = signal<ScopeEstimate | null>(null);
  protected readonly previewError = signal<string | null>(null);
  protected readonly previewing = signal(false);
  /** Description that produced the current preview: if the text changes, the preview is stale */
  private readonly previewedScope = signal<string | null>(null);
  protected readonly price = signal<Financials | null>(null);
  protected readonly pricing = signal(false);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    client_name: ['', [Validators.maxLength(100)]],
    client_company: ['', [Validators.maxLength(100)]],
    scope_description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(20000)]],
    margin_pct: [30, [Validators.required, Validators.min(0), Validators.max(200)]],
    contingency_pct: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
    discount_pct: [0, [Validators.required, Validators.min(0), Validators.max(50)]],
    vat_pct: [19, [Validators.required, Validators.min(0), Validators.max(30)]],
  });

  private readonly scopeText = toSignal(this.form.controls.scope_description.valueChanges, { initialValue: '' });

  protected readonly words = computed(() => (this.scopeText().trim().match(/\S+/g) ?? []).length);
  protected readonly modules = computed(() => (this.preview()?.items ?? []).filter((i) => i.category !== CROSS_CUTTING));
  protected readonly stalePreview = computed(() => this.preview() !== null && this.previewedScope() !== this.scopeText().trim());

  protected readonly tips = computed(() => {
    const text = normalize(this.scopeText());
    const detected = this.preview()?.analysis.modules.length ?? 0;
    return TIPS.map((tip) => ({
      ...tip,
      met: tip.pattern ? tip.pattern.test(text) : detected >= 2 || text.split(',').length >= 3,
    }));
  });

  /** 0 to 4 bars: length of the text plus how many tips it already covers. */
  protected readonly quality = computed(() => {
    const words = this.words();
    const met = this.tips().filter((t) => t.met).length;
    let score = words >= 15 ? 1 : 0;
    if (words >= 40) score++;
    if (met >= 3) score++;
    if (met >= 5 && words >= 60) score++;
    return score;
  });
  protected readonly qualityLabel = computed(() => ['Muy poco', 'Básico', 'Aceptable', 'Bueno', 'Muy bueno'][this.quality()]);

  constructor() {
    // Step 3: the estimated price follows the parameters while the user types them
    this.form.valueChanges.pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.step() === 3) this.updatePrice();
    });
  }

  protected goTo(step: Step): void {
    if (step >= 2) {
      const project = [this.form.controls.title, this.form.controls.client_name, this.form.controls.client_company];
      if (project.some((c) => c.invalid)) {
        project.forEach((c) => c.markAsTouched());
        this.step.set(1);
        return;
      }
    }
    if (step === 3) {
      const scope = this.form.controls.scope_description;
      if (scope.invalid) {
        scope.markAsTouched();
        this.step.set(2);
        return;
      }
      if (!this.preview() || this.stalePreview()) {
        this.runPreview(() => this.updatePrice());
      } else {
        this.updatePrice();
      }
    }
    this.step.set(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** AI preview: detects modules and estimates hours without saving anything. */
  protected runPreview(then?: () => void): void {
    const control = this.form.controls.scope_description;
    if (control.invalid) {
      control.markAsTouched();
      return;
    }
    const text = control.value.trim();
    this.previewing.set(true);
    this.previewError.set(null);
    this.scope.estimate(text).subscribe({
      next: (result) => {
        this.preview.set(result);
        this.previewedScope.set(text);
        this.previewing.set(false);
        then?.();
      },
      error: (err) => {
        this.preview.set(null);
        this.previewedScope.set(text);
        this.previewing.set(false);
        this.price.set(null);
        this.previewError.set(errorMessage(err));
      },
    });
  }

  private updatePrice(): void {
    const byRole = this.preview()?.estimate.by_role;
    if (!byRole) return;
    const v = this.form.getRawValue();
    const hours_by_role = Object.fromEntries(Object.entries(byRole).map(([role, row]) => [role, row.expected]));
    this.pricing.set(true);
    this.scope
      .simulatePrice({ hours_by_role, margin_pct: v.margin_pct, contingency_pct: v.contingency_pct, discount_pct: v.discount_pct, vat_pct: v.vat_pct })
      .subscribe({
        next: (financials) => {
          this.price.set(financials);
          this.pricing.set(false);
        },
        error: (err) => {
          this.price.set(null);
          this.pricing.set(false);
          this.previewError.set(errorMessage(err));
        },
      });
  }

  /** Creates the quote and runs the analysis right away. */
  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: QuoteCreate = {
      ...v,
      title: v.title.trim(),
      client_name: v.client_name.trim() || null,
      client_company: v.client_company.trim() || null,
    };
    this.saving.set(true);

    this.quotes.create(input).subscribe({
      next: (quote) => {
        this.quotes.analyze(quote.id).subscribe({
          next: () => {
            this.saving.set(false);
            this.toast.ai('Cotización lista', 'Revisa los módulos y ajusta lo que necesites.');
            void this.router.navigate(['/cotizaciones', quote.id]);
          },
          error: (err) => {
            this.saving.set(false);
            this.toast.error('La cotización se creó, pero el análisis falló', errorMessage(err));
            void this.router.navigate(['/cotizaciones', quote.id]);
          },
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('No se pudo crear la cotización', errorMessage(err));
      },
    });
  }
}
