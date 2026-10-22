import { HttpErrorResponse, HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../config/api.config';
import { AiService, aiErrorMessage } from './ai.service';

describe('servicio de IA', () => {
  function setup(): { ai: AiService; http: HttpTestingController } {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    return { ai: TestBed.inject(AiService), http: TestBed.inject(HttpTestingController) };
  }

  it('muestra el proveedor que informa el servidor y pide el estado una sola vez', () => {
    const { ai, http } = setup();
    expect(ai.configured()).toBe(false);
    ai.loadStatus();
    ai.loadStatus();
    http.expectOne(`${API_URL}/ai/status`).flush({ configured: true, provider: 'groq', model: 'openai/gpt-oss-20b' });
    http.verify();
    expect(ai.configured()).toBe(true);
    expect(ai.providerLabel()).toBe('Groq');
  });

  it('sin clave en el servidor queda deshabilitada', () => {
    const { ai, http } = setup();
    ai.loadStatus();
    http.expectOne(`${API_URL}/ai/status`).flush({ configured: false, provider: 'groq', model: 'openai/gpt-oss-20b' });
    expect(ai.configured()).toBe(false);
  });

  it('llama a cada función de la IA sobre la cotización', () => {
    const { ai, http } = setup();
    ai.scopeReview(7).subscribe();
    ai.explainPrice(7).subscribe();
    ai.clientQuestions(7).subscribe();
    ai.improveProposal(7).subscribe();
    for (const path of ['scope-review', 'explain-price', 'client-questions', 'improve-proposal']) {
      expect(http.expectOne(`${API_URL}/ai/quotes/7/${path}`).request.method).toBe('POST');
    }
  });

  it('con el límite de uso dice cuánto esperar', () => {
    const error = new HttpErrorResponse({
      status: 429,
      error: { detail: 'Se alcanzó el límite de uso de Groq.' },
      headers: new HttpHeaders({ 'Retry-After': '12' }),
    });
    expect(aiErrorMessage(error)).toBe('Se alcanzó el límite de uso de Groq. (puedes reintentar en 12 s)');
  });
});
