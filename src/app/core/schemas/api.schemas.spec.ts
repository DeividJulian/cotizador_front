import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

import { API_URL } from '../config/api.config';
import { MOCK_QUOTE, MOCK_QUOTES, MOCK_RATES, MOCK_SCOPE_ESTIMATE, MOCK_STATS, MOCK_USER } from '../mocks/mock-data';
import { QuoteService } from '../services/quote.service';
import { ContractError, parse } from '../utils/api';
import { errorMessage } from '../utils/http-error';
import { QuoteSchema, QuoteSummarySchema, RateSchema, ScopeEstimateSchema, StatsSchema } from './api.schemas';

describe('parseo de las respuestas (Zod)', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('acepta respuestas reales de la API', () => {
    expect(() => parse(QuoteSchema, MOCK_QUOTE, 'la cotización')).not.toThrow();
    MOCK_QUOTES.forEach((q) => parse(QuoteSummarySchema, q, 'la cotización'));
    MOCK_RATES.forEach((r) => parse(RateSchema, r, 'la tarifa'));
    parse(StatsSchema, MOCK_STATS, 'el panel');
    parse(ScopeEstimateSchema, MOCK_SCOPE_ESTIMATE, 'la vista previa');
  });

  it('detecta un número que llega como texto', () => {
    const wrong = { ...MOCK_QUOTE, total: '48726478' };
    expect(() => parse(QuoteSchema, wrong, 'la cotización')).toThrow(ContractError);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('total'));
  });

  it('detecta un campo que falta y un estado que el contrato no conoce', () => {
    const { items: _items, ...withoutItems } = MOCK_QUOTE;
    expect(() => parse(QuoteSchema, withoutItems, 'la cotización')).toThrow(ContractError);
    expect(() => parse(QuoteSummarySchema, { ...MOCK_QUOTES[0], status: 'pagada' }, 'la cotización')).toThrow(ContractError);
    expect(() => parse(QuoteSchema, null, 'la cotización')).toThrow(ContractError);
  });

  it('parsear devuelve un valor nuevo sin los campos que el contrato no declara', () => {
    const items = parse(QuoteSchema.shape.items, [{ ...MOCK_QUOTE.items[0], password_hash: 'x' }], 'los módulos');
    expect(items[0]).not.toHaveProperty('password_hash');
    expect(items[0].name).toBe(MOCK_QUOTE.items[0].name);
  });

  it('el servicio entrega un error con mensaje en español en lugar de datos falsos', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const quotes = TestBed.inject(QuoteService);
    const result = firstValueFrom(quotes.get(MOCK_QUOTE.id));
    TestBed.inject(HttpTestingController)
      .expectOne(`${API_URL}/quotes/${MOCK_QUOTE.id}`)
      .flush({ ...MOCK_QUOTE, financials: 'sin calcular' });
    const error = await result.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ContractError);
    expect(errorMessage(error)).toBe(
      'El servidor respondió la cotización con un formato inesperado. Recarga la página; si sigue pasando, avísanos.',
    );
  });

  it('una sesión guardada con otra forma no inicia sesión', async () => {
    localStorage.setItem('cotizador.session.v2', JSON.stringify({ token: 123, usuario: MOCK_USER }));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const { AuthService } = await import('../services/auth.service');
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
    localStorage.clear();
  });
});
