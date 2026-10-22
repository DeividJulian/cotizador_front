import { Component, inject } from '@angular/core';

import { ToastKind, ToastService } from '../../core/services/toast.service';
import { Icon, IconName } from '../icon/icon';

const ICON_BY_KIND: Record<ToastKind, IconName> = { success: 'check', error: 'warning', warning: 'info', ai: 'sparkle' };

@Component({
  selector: 'app-toasts',
  imports: [Icon],
  template: `
    <div class="toast-region" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.kind" [attr.role]="toast.kind === 'error' ? 'alert' : 'status'">
          <span class="toast__icon"><app-icon [name]="icons[toast.kind]" /></span>
          <div class="toast__body">
            <div class="toast__title">{{ toast.title }}</div>
            @if (toast.text) {
              <div class="toast__msg">{{ toast.text }}</div>
            }
          </div>
          <button class="toast__close" type="button" aria-label="Cerrar" (click)="toasts.dismiss(toast.id)">
            <app-icon name="close" size="sm" />
          </button>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly toasts = inject(ToastService);
  protected readonly icons = ICON_BY_KIND;
}
