import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import * as api from '../../api/functions';
import { API_URL } from '../config/api.config';
import { CodeSent, RegisterInput, Session } from '../models';
import { CodeSentSchema, SessionSchema, UserSchema } from '../schemas/api.schemas';
import { parsed } from '../utils/api';

// v2: sessions saved before the API moved to English names are dropped (the user logs in again)
const STORAGE_KEY = 'cotizador.session.v2';

/** true when the JWT already expired (or cannot be read). */
export function tokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

/** localStorage can hold anything (an old version, a manual edit): it is parsed like an API response. */
function readStoredSession(): Session | null {
  try {
    const stored = SessionSchema.safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'));
    return stored.success && !tokenExpired(stored.data.token) ? stored.data : null;
  } catch {
    return null;
  }
}

/**
 * Passwordless session: the user asks for a 6-digit code by email and exchanges it for a token.
 * It is kept in localStorage so the session (and the progress) survives a page reload.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly session = signal<Session | null>(readStoredSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);

  register(input: RegisterInput): Observable<CodeSent> {
    return api
      .register(this.http, API_URL, { body: input })
      .pipe(parsed(CodeSentSchema, 'la confirmación del correo'));
  }

  /** Emails a login code (it also resends the sign-up code). */
  requestCode(email: string): Observable<CodeSent> {
    return api
      .login(this.http, API_URL, { body: { email } })
      .pipe(parsed(CodeSentSchema, 'la confirmación del correo'));
  }

  verify(email: string, code: string): Observable<Session> {
    return api.verify(this.http, API_URL, { body: { email, code } }).pipe(
      parsed(SessionSchema, 'la sesión'),
      tap((session) => this.store(session)),
    );
  }

  /** Checks with the backend that the saved session is still valid. */
  refreshProfile(): void {
    const current = this.session();
    if (!current) return;
    api
      .currentAccount(this.http, API_URL)
      .pipe(parsed(UserSchema, 'tu cuenta'))
      .subscribe({
        next: (user) => this.store({ ...current, user }),
        error: () => undefined, // a 401 is handled by the interceptor, which logs out
      });
  }

  logout(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage blocked: forgetting the session in memory is enough
    }
    // The responses cached by the Service Worker belong to this user: another account must not see them
    if (typeof caches !== 'undefined') {
      void caches
        .keys()
        .then((names) =>
          names.filter((n) => n.startsWith('cot-api')).forEach((n) => caches.delete(n)),
        );
    }
    void this.router.navigateByUrl('/login');
  }

  private store(session: Session): void {
    this.session.set(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // without storage the session lasts until the page reloads
    }
  }
}
