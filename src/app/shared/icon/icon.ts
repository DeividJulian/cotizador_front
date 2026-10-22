import { Component, computed, input } from '@angular/core';

type Shape =
  | { t: 'path'; d: string }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
  | { t: 'circle'; cx: number; cy: number; r: number };

const p = (d: string): Shape => ({ t: 'path', d });
const rect = (x: number, y: number, w: number, h: number, rx?: number): Shape => ({ t: 'rect', x, y, w, h, rx });
const circle = (cx: number, cy: number, r: number): Shape => ({ t: 'circle', cx, cy, r });

/** Stroke icons of the design (24×24, currentColor). */
const ICONS = {
  brand: [p('M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z'), circle(7.5, 7.5, 1.5)],
  dashboard: [rect(3, 3, 7, 9, 1), rect(14, 3, 7, 5, 1), rect(14, 12, 7, 9, 1), rect(3, 16, 7, 5, 1)],
  quotes: [p('M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'), p('M14 3v6h6'), p('M8 13h8M8 17h5')],
  file: [p('M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'), p('M14 3v6h6')],
  money: [circle(12, 12, 9), p('M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6.5V8M12 16v1.5')],
  logout: [p('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'), p('M16 17l5-5-5-5'), p('M21 12H9')],
  plus: [p('M5 12h14'), p('M12 5v14')],
  mail: [rect(3, 5, 18, 14, 2), p('m3 7 9 6 9-6')],
  check: [p('M20 6 9 17l-5-5')],
  close: [p('M18 6 6 18M6 6l12 12')],
  sparkle: [p('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z')],
  sparkles: [p('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'), p('M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z')],
  edit: [p('M12 20h9'), p('M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z')],
  trash: [p('M3 6h18'), p('M8 6V4h8v2'), p('M19 6l-1 14H6L5 6')],
  back: [p('M19 12H5'), p('m12 19-7-7 7-7')],
  forward: [p('M5 12h14'), p('m12 5 7 7-7 7')],
  refresh: [p('M3 12a9 9 0 0 1 15.5-6.2L21 8'), p('M21 3v5h-5'), p('M21 12a9 9 0 0 1-15.5 6.2L3 16'), p('M3 21v-5h5')],
  reset: [p('M3 12a9 9 0 1 0 3-6.7L3 8'), p('M3 3v5h5')],
  download: [p('M12 3v12'), p('M7 10l5 5 5-5'), p('M5 21h14')],
  print: [p('M6 9V3h12v6'), rect(3, 9, 18, 8, 2), p('M6 14h12v7H6z')],
  trend: [p('M3 17l6-6 4 4 8-8'), p('M14 7h7v7')],
  chart: [p('M3 3v18h18'), p('M7 15l4-4 3 3 5-6')],
  bars: [p('M3 3v18h18'), p('M7 16v-3M11 16V8M15 16v-5M19 16v-9')],
  modules: [rect(3, 3, 7, 7, 1), rect(14, 3, 7, 7, 1), rect(3, 14, 7, 7, 1), rect(14, 14, 7, 7, 1)],
  clock: [circle(12, 12, 9), p('M12 7v5l3 2')],
  info: [circle(12, 12, 9), p('M12 16v-4M12 8h.01')],
  warning: [p('M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'), p('M12 9v4M12 17h.01')],
  shield: [p('M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z'), p('m9 12 2 2 4-4')],
  bulb: [p('M9 18h6M10 22h4'), p('M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z')],
  chip: [rect(5, 5, 14, 14, 2), rect(9, 9, 6, 6), p('M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3')],
  offline: [p('M2 2l20 20'), p('M8.5 16.5a5 5 0 0 1 7 0'), p('M12 20h.01')],
  filter: [p('M3 5h18l-7 8v6l-4 2v-8z')],
  question: [circle(12, 12, 9), p('M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14'), p('M12 17h.01')],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  template: `
    <svg class="icon" [class.icon--sm]="size() === 'sm'" [class.icon--lg]="size() === 'lg'" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" [attr.stroke-width]="name() === 'brand' ? 2.2 : 2" stroke-linecap="round"
      stroke-linejoin="round" aria-hidden="true">
      @for (shape of shapes(); track $index) {
        @switch (shape.t) {
          @case ('path') { <path [attr.d]="$any(shape).d" /> }
          @case ('rect') {
            <rect [attr.x]="$any(shape).x" [attr.y]="$any(shape).y" [attr.width]="$any(shape).w"
              [attr.height]="$any(shape).h" [attr.rx]="$any(shape).rx ?? null" />
          }
          @case ('circle') { <circle [attr.cx]="$any(shape).cx" [attr.cy]="$any(shape).cy" [attr.r]="$any(shape).r" /> }
        }
      }
    </svg>
  `,
  styles: `:host { display: contents; }`,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly shapes = computed<Shape[]>(() => ICONS[this.name()]);
}
