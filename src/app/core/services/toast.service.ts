import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'ai';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  text?: string;
}

const DURATION_MS: Record<ToastKind, number> = { success: 3500, ai: 4500, warning: 5000, error: 9000 };

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  ok(title: string, text?: string): void {
    this.push('success', title, text);
  }

  info(title: string, text?: string): void {
    this.push('warning', title, text);
  }

  ai(title: string, text?: string): void {
    this.push('ai', title, text);
  }

  error(title: string, text?: string): void {
    this.push('error', title, text);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, title: string, text?: string): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, kind, title, text }]);
    setTimeout(() => this.dismiss(id), DURATION_MS[kind]);
  }
}
