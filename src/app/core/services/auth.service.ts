import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { API_URL } from '../config/api.config';
import { CodeSent, RegisterInput, Session, User } from '../models';

const STORAGE_KEY = 'cotizador.session';

/** true si el token JWT ya venció (o no se puede leer). */
export function tokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function readStoredSession(): Session | null {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Session | null;
    return session?.token && !tokenExpired(session.token) ? session : null;
  } catch {
    return null;
  }
}

/**
 * Sesión sin contraseña: el usuario pide un código de 6 dígitos por correo y lo canjea por un token.
 * El token se guarda en localStorage para que la sesión sobreviva a recargar la página.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly url = `${API_URL}/auth`;

  private readonly session = signal<Session | null>(readStoredSession());

  readonly user = computed(() => this.session()?.usuario ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => this.user()?.rol === 'admin');

  register(input: RegisterInput): Observable<CodeSent> {
    return this.http.post<CodeSent>(`${this.url}/registro`, input);
  }

  /** Envía un código de acceso al correo (sirve también para reenviar el de registro). */
  requestCode(email: string): Observable<CodeSent> {
    return this.http.post<CodeSent>(`${this.url}/login`, { email });
  }

  verify(email: string, codigo: string): Observable<Session> {
    return this.http.post<Session>(`${this.url}/verificar`, { email, codigo }).pipe(tap((session) => this.store(session)));
  }

  /** Vuelve a leer el perfil: si un admin cambió el rol, la interfaz se ajusta sin volver a entrar. */
  refreshProfile(): void {
    const current = this.session();
    if (!current) return;
    this.http.get<User>(`${this.url}/me`).subscribe({
      next: (usuario) => this.store({ ...current, usuario }),
      error: () => undefined, // un 401 lo maneja el interceptor cerrando la sesión
    });
  }

  homeUrl(): string {
    return this.isAdmin() ? '/' : '/mis-cotizaciones';
  }

  logout(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // almacenamiento bloqueado: basta con olvidar la sesión en memoria
    }
    // Las respuestas guardadas por el Service Worker son de este usuario: no deben verse con otra cuenta
    if (typeof caches !== 'undefined') {
      void caches.keys().then((names) => names.filter((n) => n.startsWith('cot-api')).forEach((n) => caches.delete(n)));
    }
    void this.router.navigateByUrl('/login');
  }

  private store(session: Session): void {
    this.session.set(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // sin almacenamiento la sesión dura hasta recargar
    }
  }
}
