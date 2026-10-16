import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { loadGoogleIdentity } from '../../core/auth/google-identity';
import { GOOGLE_CLIENT_ID } from '../../core/config/api.config';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/utils/http-error';

type Status = 'loading' | 'ready' | 'signing' | 'error';

/** Pantalla de acceso: un solo botón "Continuar con Google". La primera vez crea la cuenta. */
@Component({
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login implements AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  private readonly buttonHost = viewChild.required<ElementRef<HTMLDivElement>>('googleButton');

  protected readonly status = signal<Status>('loading');
  protected readonly problem = signal<string | null>(null);

  ngAfterViewInit(): void {
    this.setupGoogle();
  }

  protected setupGoogle(): void {
    if (!GOOGLE_CLIENT_ID) {
      this.fail('Google sign-in is not configured yet (missing GOOGLE_CLIENT_ID in api.config.ts).');
      return;
    }
    this.status.set('loading');
    this.problem.set(null);
    loadGoogleIdentity()
      .then((google) => {
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: ({ credential }) => this.signIn(credential),
          cancel_on_tap_outside: true,
        });
        google.renderButton(this.buttonHost().nativeElement, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width: 300,
          locale: 'en',
        });
        this.status.set('ready');
      })
      .catch((error: unknown) => this.fail(errorMessage(error)));
  }

  private signIn(credential: string): void {
    this.status.set('signing');
    this.auth.loginWithGoogle(credential).subscribe({
      next: (session) => {
        this.toast.ok(`Welcome, ${session.usuario.nombre}`);
        void this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.status.set('ready');
        this.toast.error(errorMessage(err));
      },
    });
  }

  private fail(message: string): void {
    this.status.set('error');
    this.problem.set(message);
  }
}
