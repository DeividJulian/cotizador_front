import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { API_URL } from '../config/api.config';
import { Session } from '../models';
import { AuthService, tokenExpired } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { authGuard, guestGuard } from './guards';

function base64url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Token con la forma de un JWT (el front no verifica la firma, solo lee el vencimiento). */
function fakeToken(secondsFromNow: number): string {
  return `${base64url({ alg: 'HS256' })}.${base64url({ sub: '1', exp: Math.floor(Date.now() / 1000) + secondsFromNow })}.firma`;
}

function session(secondsFromNow = 3600): Session {
  return {
    token: fakeToken(secondsFromNow),
    usuario: {
      id: 1, nombre: 'Ana', email: 'ana@pyme.com',
      creado_en: '2026-10-01T00:00:00Z', ultimo_acceso: null,
    },
  };
}

function storeSession(secondsFromNow = 3600): Session {
  const value = session(secondsFromNow);
  localStorage.setItem('cotizador.session', JSON.stringify(value));
  return value;
}

function setup(): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'login', children: [] }]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ],
  });
}

function runGuard(guard: typeof authGuard): boolean | UrlTree {
  return TestBed.runInInjectionContext(
    () => guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as boolean | UrlTree,
  );
}

const path = (result: boolean | UrlTree) => (result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result);

describe('sesión por código e interceptor', () => {
  beforeEach(() => localStorage.clear());

  it('reconoce tokens vencidos y vigentes', () => {
    expect(tokenExpired(fakeToken(60))).toBe(false);
    expect(tokenExpired(fakeToken(-60))).toBe(true);
    expect(tokenExpired('no-es-un-jwt')).toBe(true);
  });

  it('pide el código al correo sin crear sesión todavía', () => {
    setup();
    const auth = TestBed.inject(AuthService);
    auth.requestCode('ana@pyme.com').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(`${API_URL}/auth/login`);
    expect(request.request.body).toEqual({ email: 'ana@pyme.com' });
    request.flush({ mensaje: 'sent', email: 'ana@pyme.com' });
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('canjea el código por la sesión de la app y la guarda', () => {
    setup();
    const auth = TestBed.inject(AuthService);
    const expected = session();
    auth.verify('ana@pyme.com', '123456').subscribe();

    const request = TestBed.inject(HttpTestingController).expectOne(`${API_URL}/auth/verificar`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ana@pyme.com', codigo: '123456' });
    request.flush(expected);

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.user()?.email).toBe('ana@pyme.com');
    expect(JSON.parse(localStorage.getItem('cotizador.session')!).token).toBe(expected.token);
  });

  it('un código incorrecto no deja sesión', () => {
    setup();
    const auth = TestBed.inject(AuthService);
    auth.verify('ana@pyme.com', '000000').subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController)
      .expectOne(`${API_URL}/auth/verificar`)
      .flush({ detail: 'Incorrect code' }, { status: 400, statusText: 'Bad Request' });
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('cotizador.session')).toBeNull();
  });

  it('restaura la sesión guardada (el progreso no se pierde al recargar) y descarta la vencida', () => {
    storeSession();
    setup();
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(true);

    TestBed.resetTestingModule();
    storeSession(-10);
    setup();
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
  });

  it('envía el token solo a las peticiones del backend', () => {
    const saved = storeSession();
    setup();
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);

    http.get(`${API_URL}/cotizaciones`).subscribe();
    http.get('https://otro-sitio.com/datos').subscribe();

    expect(backend.expectOne(`${API_URL}/cotizaciones`).request.headers.get('Authorization')).toBe(`Bearer ${saved.token}`);
    expect(backend.expectOne('https://otro-sitio.com/datos').request.headers.has('Authorization')).toBe(false);
  });

  it('cierra la sesión cuando el backend responde 401', () => {
    storeSession();
    setup();
    const auth = TestBed.inject(AuthService);
    TestBed.inject(HttpClient).get(`${API_URL}/cotizaciones`).subscribe({ error: () => undefined });

    TestBed.inject(HttpTestingController)
      .expectOne(`${API_URL}/cotizaciones`)
      .flush({ detail: 'Session expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('cotizador.session')).toBeNull();
  });

  it('cerrar sesión borra la sesión guardada', () => {
    storeSession();
    setup();
    const auth = TestBed.inject(AuthService);
    auth.logout();
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('cotizador.session')).toBeNull();
  });
});

describe('guards de sesión', () => {
  beforeEach(() => localStorage.clear());

  it('sin sesión, las pantallas de la app mandan al login', () => {
    setup();
    expect(path(runGuard(authGuard))).toBe('/login');
    expect(runGuard(guestGuard)).toBe(true);
  });

  it('con sesión, el login manda al panel', () => {
    storeSession();
    setup();
    expect(runGuard(authGuard)).toBe(true);
    expect(path(runGuard(guestGuard))).toBe('/');
  });
});
