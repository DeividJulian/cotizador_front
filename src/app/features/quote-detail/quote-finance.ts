import { Component, computed, input } from '@angular/core';

import { Quote } from '../../core/models';
import { cop, num } from '../../core/utils/format';

interface Slice {
  label: string;
  value: number;
  color: string;
  width: number;
}

/** Desglose del precio: de dónde sale cada peso del total. */
@Component({
  selector: 'app-quote-finance',
  templateUrl: './quote-finance.html',
})
export class QuoteFinance {
  readonly quote = input.required<Quote>();

  protected readonly cop = cop;
  protected readonly num = num;

  protected readonly slices = computed<Slice[]>(() => {
    const f = this.quote().financiero;
    const parts = [
      { label: 'Direct cost', value: f.costo_directo ?? 0, color: '#60a5fa' },
      { label: 'Contingency', value: f.contingencia ?? 0, color: '#fbbf24' },
      { label: 'Margin', value: f.margen ?? 0, color: '#2dd4bf' },
      { label: 'VAT', value: f.iva ?? 0, color: '#a99bff' },
    ];
    const sum = parts.reduce((n, p) => n + p.value, 0) || 1;
    return parts.map((p) => ({ ...p, width: (p.value / sum) * 100 }));
  });

  protected readonly roles = computed(() => {
    const estimates = this.quote().estimacion.por_rol ?? {};
    return Object.entries(estimates).map(([role, e]) => ({ role, ...e }));
  });
}
