import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { API_URL } from '../config/api.config';
import { Role, Session } from '../models';
import { AuthService, tokenExpired } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { adminGuard, clientGuard, guestGuard } from './guards';

function base64url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Token con la forma de un JWT (el front no verifica la firma, solo lee el vencimiento). */
function fakeToken(secondsFromNow: number): string {
  return `${base64url({ alg: 'HS256' })}.${base64url({ sub: '1', exp: Math.floor(Date.now() / 1000) + secondsFromNow })}.firma`;
}

function storeSession(rol: Role, secondsFromNow = 3600): Session {
  const session: Session = {
    token: fakeToken(secondsFromNow),
    usuario: {
      id: 1, nombre: 'Ana', email: 'ana@pyme.com', empresa: null, rol, verificado: true,
      cliente_id: rol === 'cliente' ? 7 : null, creado_en: '2026-10-01T00:00:00Z', ultimo_acceso: null,
    },
  };
  localStorage.setItem('cotizador.session', JSON.stringify(session));
  return session;
}

function setup(): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'login', children: [] }, { path: 'mis-cotizaciones', children: [] }]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ],
  });
}

function runGuard(guard: typeof adminGuard): boolean | UrlTree {
  return TestBed.runInInjectionContext(
    () => guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as boolean | UrlTree,
  );
}

const path = (result: boolean | UrlTree) => (result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result);

describe('sesión e interceptor de autenticación', () => {
  beforeEach(() => localStorage.clear());

  it('reconoce tokens vencidos y vigentes', () => {
    expect(tokenExpired(fakeToken(60))).toBe(false);
    expect(tokenExpired(fakeToken(-60))).toBe(true);
    expect(tokenExpired('no-es-un-jwt')).toBe(true);
  });

  it('restaura la sesión guardada y descarta la vencida', () => {
    storeSession('admin');
    setup();
    expect(TestBed.inject(AuthService).isAdmin()).toBe(true);

    TestBed.resetTestingModule();
    storeSession('admin', -10);
    setup();
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
  });

  it('envía el token solo a las peticiones del backend', () => {
    const session = storeSession('cliente');
    setup();
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);

    http.get(`${API_URL}/cotizaciones`).subscribe();
    http.get('https://otro-sitio.com/datos').subscribe();

    expect(backend.expectOne(`${API_URL}/cotizaciones`).request.headers.get('Authorization')).toBe(`Bearer ${session.token}`);
    expect(backend.expectOne('https://otro-sitio.com/datos').request.headers.has('Authorization')).toBe(false);
  });

  it('cierra la sesión cuando el backend responde 401', () => {
    storeSession('cliente');
    setup();
    const auth = TestBed.inject(AuthService);
    TestBed.inject(HttpClient).get(`${API_URL}/cotizaciones`).subscribe({ error: () => undefined });

    TestBed.inject(HttpTestingController)
      .expectOne(`${API_URL}/cotizaciones`)
      .flush({ detail: 'Session expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('cotizador.session')).toBeNull();
  });

  it('un código incorrecto (400 en /auth/verificar) no cierra nada ni guarda sesión', () => {
    setup();
    const auth = TestBed.inject(AuthService);
    auth.verify('ana@pyme.com', '000000').subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController)
      .expectOne(`${API_URL}/auth/verificar`)
      .flush({ detail: 'Incorrect code' }, { status: 400, statusText: 'Bad Request' });
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('guarda la sesión al verificar el código', () => {
    setup();
    const auth = TestBed.inject(AuthService);
    const session = storeSession('admin');
    localStorage.clear();
    auth.verify('ana@pyme.com', '123456').subscribe();
    TestBed.inject(HttpTestingController).expectOne(`${API_URL}/auth/verificar`).flush(session);
    expect(auth.isAdmin()).toBe(true);
    expect(JSON.parse(localStorage.getItem('cotizador.session')!).token).toBe(session.token);
  });
});

describe('guards por rol', () => {
  beforeEach(() => localStorage.clear());

  it('sin sesión, las pantallas protegidas mandan al login', () => {
    setup();
    expect(path(runGuard(adminGuard))).toBe('/login');
    expect(path(runGuard(clientGuard))).toBe('/login');
    expect(runGuard(guestGuard)).toBe(true);
  });

  it('un cliente no entra a las pantallas de admin', () => {
    storeSession('cliente');
    setup();
    expect(path(runGuard(adminGuard))).toBe('/mis-cotizaciones');
    expect(runGuard(clientGuard)).toBe(true);
    expect(path(runGuard(guestGuard))).toBe('/mis-cotizaciones');
  });

  it('un admin entra a sus pantallas y no a las del cliente', () => {
    storeSession('admin');
    setup();
    expect(runGuard(adminGuard)).toBe(true);
    expect(path(runGuard(clientGuard))).toBe('/');
    expect(path(runGuard(guestGuard))).toBe('/');
  });
});
