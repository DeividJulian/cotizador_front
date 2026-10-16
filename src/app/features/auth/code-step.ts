import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/http-error';

const RESEND_SECONDS = 30; // misma espera que exige el backend entre códigos

/** Segundo paso del login y del registro: escribir el código de 6 dígitos que llegó al correo. */
@Component({
  selector: 'app-code-step',
  imports: [ReactiveFormsModule],
  templateUrl: './code-step.html',
})
export class CodeStep implements OnInit {
  readonly email = input.required<string>();
  readonly verified = output<void>();
  readonly back = output<void>();

  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly code = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });
  protected readonly verifying = signal(false);
  protected readonly resending = signal(false);
  protected readonly cooldown = signal(RESEND_SECONDS);

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startCooldown();
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  protected verify(event: Event): void {
    event.preventDefault();
    this.code.setValue(this.code.value.replace(/\D/g, ''));
    if (this.code.invalid) {
      this.code.markAsTouched();
      return;
    }
    this.verifying.set(true);
    this.auth.verify(this.email(), this.code.value).subscribe({
      next: (session) => {
        this.verifying.set(false);
        this.toast.ok(`Welcome, ${session.usuario.nombre}`);
        this.verified.emit();
      },
      error: (err) => {
        this.verifying.set(false);
        this.code.reset();
        this.toast.error(errorMessage(err));
      },
    });
  }

  protected resend(): void {
    this.resending.set(true);
    this.auth.requestCode(this.email()).subscribe({
      next: () => {
        this.resending.set(false);
        this.code.reset();
        this.toast.info('We sent you a new code');
        this.startCooldown();
      },
      error: (err) => {
        this.resending.set(false);
        this.toast.error(errorMessage(err));
      },
    });
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
