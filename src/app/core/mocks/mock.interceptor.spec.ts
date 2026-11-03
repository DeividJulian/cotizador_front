import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import * as api from '../../api/functions';
import { API_URL } from '../config/api.config';
import { MOCK_QUOTE, MOCK_QUOTES } from './mock-data';
import { findMock, mockInterceptor } from './mock.interceptor';

describe('modo de prueba (mocks del contrato)', () => {
  function setup(): HttpClient {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockInterceptor])), provideHttpClientTesting()],
    });
    return TestBed.inject(HttpClient);
  }

  afterEach(() => localStorage.clear());

  it('encuentra el mock por la ruta del contrato, con parámetros', () => {
    expect(findMock('GET', `${API_URL}/quotes/7`)?.[1]).toBe(api.readQuote.PATH);
    expect(findMock('POST', `${API_URL}/quotes/7/items`)?.[1]).toBe(api.addItem.PATH);
    expect(findMock('GET', `${API_URL}/quotes?status=draft`)?.[1]).toBe(api.listQuotes.PATH);
    expect(findMock('GET', `${API_URL}/no-existe`)).toBeUndefined();
    expect(findMock('GET', 'https://otro-dominio.com/quotes')).toBeUndefined();
  });

  it('con el modo activo responde sin llamar al backend', async () => {
    localStorage.setItem('cotizador.mock', '1');
    const http = setup();
    const quote = await firstValueFrom(api.readQuote(http, API_URL, { quote_id: MOCK_QUOTE.id }));
    expect(quote.body.title).toBe(MOCK_QUOTE.title);
    const list = await firstValueFrom(api.listQuotes(http, API_URL));
    expect(list.body).toHaveLength(MOCK_QUOTES.length);
    TestBed.inject(HttpTestingController).verify();
  });

  it('sin el modo activo la petición va al backend', () => {
    const http = setup();
    api.myStats(http, API_URL).subscribe();
    TestBed.inject(HttpTestingController).expectOne(`${API_URL}/stats`);
  });
});
