import { Component, inject } from '@angular/core';

import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toasts',
  template: `
    <div class="stack" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <button type="button" class="toast" [class]="toast.kind" (click)="toasts.dismiss(toast.id)">
          {{ toast.text }}
        </button>
      }
    </div>
  `,
  styles: `
    .stack { position: fixed; top: 76px; right: 16px; display: grid; gap: 8px; z-index: 60; max-width: min(380px, calc(100vw - 32px)); }
    .toast { text-align: left; font: inherit; color: var(--text); padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface-2); cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,.4); }
    .toast.ok { border-color: rgba(52, 211, 153, 0.6); }
    .toast.error { border-color: rgba(248, 113, 113, 0.7); }
    .toast.info { border-color: rgba(96, 165, 250, 0.6); }
  `,
})
export class Toasts {
  protected readonly toasts = inject(ToastService);
}
