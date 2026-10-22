import { Component, DestroyRef, ElementRef, OnInit, computed, inject, input, output, signal, viewChildren } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/http-error';
import { Icon } from '../../shared/icon/icon';

const RESEND_SECONDS = 30; // the same wait the backend enforces between codes
const LENGTH = 6;

/** Second step of log in and sign up: type the 6-digit code that arrived by email (one box per digit). */
@Component({
  selector: 'app-code-step',
  imports: [Icon],
  templateUrl: './code-step.html',
})
export class CodeStep implements OnInit {
  readonly email = input.required<string>();
  readonly verified = output<void>();
  readonly back = output<void>();

  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('digit');

  protected readonly positions = Array.from({ length: LENGTH }, (_, i) => i);
  protected readonly digits = signal<string[]>(Array(LENGTH).fill(''));
  protected readonly code = computed(() => this.digits().join(''));
  protected readonly complete = computed(() => /^\d{6}$/.test(this.code()));
  protected readonly verifying = signal(false);
  protected readonly resending = signal(false);
  protected readonly cooldown = signal(RESEND_SECONDS);

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startCooldown();
    this.destroyRef.onDestroy(() => this.stopTimer());
    setTimeout(() => this.focus(0));
  }

  protected onInput(index: number, event: Event): void {
    const box = event.target as HTMLInputElement;
    const typed = box.value.replace(/\D/g, '');
    if (typed.length > 1) {
      this.fill(typed, index); // autocomplete or fast typing can put several digits in one box
      return;
    }
    this.setDigit(index, typed);
    box.value = typed;
    if (typed && index < LENGTH - 1) this.focus(index + 1);
    if (this.complete()) this.verify();
  }

  protected onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      this.setDigit(index - 1, '');
      this.focus(index - 1);
      event.preventDefault();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.focus(index - 1);
    } else if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      this.focus(index + 1);
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
    if (!pasted) return;
    event.preventDefault();
    this.fill(pasted, 0);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.complete()) this.verify();
  }

  protected resend(): void {
    this.resending.set(true);
    this.auth.requestCode(this.email()).subscribe({
      next: () => {
        this.resending.set(false);
        this.clear();
        this.toast.ok('Te enviamos un código nuevo', 'Revisa tu correo (y la carpeta de spam).');
        this.startCooldown();
      },
      error: (err) => {
        this.resending.set(false);
        this.toast.error('No se pudo reenviar el código', errorMessage(err));
      },
    });
  }

  private verify(): void {
    if (this.verifying()) return;
    this.verifying.set(true);
    this.auth.verify(this.email(), this.code()).subscribe({
      next: (session) => {
        this.verifying.set(false);
        this.toast.ok(`¡Hola, ${session.user.name}!`);
        this.verified.emit();
      },
      error: (err) => {
        this.verifying.set(false);
        this.clear();
        this.toast.error('No pudimos verificar el código', errorMessage(err));
      },
    });
  }

  private fill(text: string, from: number): void {
    const next = [...this.digits()];
    for (let i = 0; i < text.length && from + i < LENGTH; i++) next[from + i] = text[i];
    this.digits.set(next);
    this.boxes().forEach((box, i) => (box.nativeElement.value = next[i]));
    this.focus(Math.min(from + text.length, LENGTH - 1));
    if (this.complete()) this.verify();
  }

  private setDigit(index: number, value: string): void {
    this.digits.update((list) => list.map((d, i) => (i === index ? value : d)));
  }

  private clear(): void {
    this.digits.set(Array(LENGTH).fill(''));
    this.boxes().forEach((box) => (box.nativeElement.value = ''));
    this.focus(0);
  }

  private focus(index: number): void {
    this.boxes()[index]?.nativeElement.focus();
  }

  private startCooldown(): void {
    this.stopTimer();
    this.cooldown.set(RESEND_SECONDS);
    this.timer = setInterval(() => {
      this.cooldown.update((s) => Math.max(0, s - 1));
      if (this.cooldown() === 0) this.stopTimer();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
