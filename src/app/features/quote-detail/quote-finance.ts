import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Quote } from '../../core/models';
import { cop, num, roleColor } from '../../core/utils/format';

interface Slice {
  label: string;
  value: number;
  color: number;
  pct: number;
}

/** Same proportions as the .timeline-track grid (2fr 4fr 3fr). */
const PHASES = [
  { name: 'Diseño', share: 2 / 9 },
  { name: 'Desarrollo', share: 6 / 9 },
  { name: 'Pruebas y entrega', share: 1 },
];

/** Price breakdown: where each peso of the total comes from. */
@Component({
  selector: 'app-quote-finance',
  imports: [RouterLink],
  templateUrl: './quote-finance.html',
})
export class QuoteFinance {
  readonly quote = input.required<Quote>();

  protected readonly cop = cop;
  protected readonly num = num;
  protected readonly roleColor = roleColor;

  protected readonly f = computed(() => this.quote().financials);
  protected readonly hasPrice = computed(() => !!this.f().total);

  protected readonly slices = computed<Slice[]>(() => {
    const f = this.f();
    const parts = [
      { label: 'Costo directo', value: f.direct_cost ?? 0, color: 1 },
      { label: 'Contingencia', value: f.contingency ?? 0, color: 4 },
      { label: 'Margen', value: (f.margin ?? 0) - (f.discount ?? 0), color: 3 },
      { label: 'IVA', value: f.vat ?? 0, color: 2 },
    ];
    const total = f.total || 1;
    return parts.filter((p) => p.value > 0).map((p) => ({ ...p, pct: (p.value / total) * 100 }));
  });

  protected readonly barLabel = computed(() =>
    this.slices().map((s) => `${s.label} ${s.pct.toFixed(1)} %`).join(', ') + ' del total',
  );

  protected readonly roles = computed(() => {
    const rows = this.f().by_role ?? [];
    const direct = this.f().direct_cost || 1;
    return rows.map((r) => ({ ...r, share: (r.cost / direct) * 100 }));
  });

  protected readonly totalHours = computed(() => this.roles().reduce((n, r) => n + r.hours, 0));

  /** Hour range per role, as a share of the largest pessimistic value. */
  protected readonly ranges = computed(() => {
    const byRole = this.quote().estimate.by_role ?? {};
    const rows = Object.entries(byRole).map(([role, e]) => ({ role, ...e }));
    const max = Math.max(1, ...rows.map((r) => r.pessimistic));
    const scale = (h: number) => (h / max) * 100;
    return {
      max,
      rows: rows
        .sort((a, b) => b.expected - a.expected)
        .map((r) => ({ ...r, left: scale(r.optimistic), width: scale(r.pessimistic - r.optimistic), mark: scale(r.expected) })),
    };
  });

  protected readonly scale = computed(() => {
    const max = this.ranges().max;
    return [0, 0.25, 0.5, 0.75, 1].map((f) => num(Math.round(max * f)));
  });

  protected readonly phases = computed(() => {
    const weeks = this.f().duration_weeks ?? 1;
    let start = 1;
    return PHASES.map((phase) => {
      const end = Math.max(start, Math.round(weeks * phase.share));
      const label = start === end ? `sem ${start}` : `sem ${start}–${end}`;
      start = Math.min(weeks, end + 1);
      return { name: phase.name, label };
    });
  });

  protected readonly weekScale = computed(() => {
    const weeks = this.f().duration_weeks ?? 1;
    const marks = [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.max(1, Math.round(weeks * f))))];
    return marks.map((w) => `Semana ${w}`);
  });

  protected milestoneWhen(week: number): string {
    return week === 0 ? 'Semana 0 · antes de empezar' : `Al terminar la semana ${week}`;
  }
}
