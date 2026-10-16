import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/http-error';
import { CodeStep } from './code-step';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, CodeStep],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly sentTo = signal<string | null>(null);
  protected readonly sending = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
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
        this.toast.error(errorMessage(err));
      },
    });
  }

  protected enter(): void {
    void this.router.navigateByUrl(this.auth.homeUrl());
  }
}
