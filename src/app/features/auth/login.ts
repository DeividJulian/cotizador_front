import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/http-error';
import { Icon } from '../../shared/icon/icon';
import { AuthPitch } from './auth-pitch';
import { CodeStep } from './code-step';

/** code: the normal login (6-digit code by email). password: only the demo account. */
type Mode = 'code' | 'password';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, CodeStep, AuthPitch, Icon],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly mode = signal<Mode>('code');
  protected readonly sentTo = signal<string | null>(null);
  protected readonly sending = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected requestCode(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const email = this.form.controls.email.value.trim().toLowerCase();
    this.sending.set(true);
    this.auth.requestCode(email).subscribe({
      next: () => {
        this.sending.set(false);
        this.sentTo.set(email);
      },
      error: (err) => {
        this.sending.set(false);
        this.toast.error('No pudimos enviarte el código', errorMessage(err));
      },
    });
  }

  protected loginWithPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { email, password } = this.passwordForm.getRawValue();
    this.sending.set(true);
    this.auth.loginWithPassword(email.trim().toLowerCase(), password).subscribe({
      next: () => {
        this.sending.set(false);
        this.enter();
      },
      error: (err) => {
        this.sending.set(false);
        this.toast.error('No pudimos iniciar sesión', errorMessage(err));
      },
    });
  }

  protected enter(): void {
    void this.router.navigateByUrl('/');
  }
}
