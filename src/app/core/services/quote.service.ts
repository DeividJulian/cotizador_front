import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import {
  ItemInput,
  ItemUpdate,
  Quote,
  QuoteCreate,
  QuoteStatus,
  QuoteSummary,
  QuoteUpdate,
  SimilarQuote,
} from '../models';

@Injectable({ providedIn: 'root' })
export class QuoteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/cotizaciones`;

  list(status?: QuoteStatus | ''): Observable<QuoteSummary[]> {
    return this.http.get<QuoteSummary[]>(this.url, { params: status ? { estado: status } : {} });
  }

  get(id: number): Observable<Quote> {
    return this.http.get<Quote>(`${this.url}/${id}`);
  }

  create(input: QuoteCreate): Observable<Quote> {
    return this.http.post<Quote>(this.url, input);
  }

  update(id: number, input: QuoteUpdate): Observable<Quote> {
    return this.http.put<Quote>(`${this.url}/${id}`, input);
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.url}/${id}`);
  }

  /** Ejecuta el análisis del alcance: detecta módulos, estima horas (PERT) y calcula el precio. */
  analyze(id: number): Observable<Quote> {
    return this.http.post<Quote>(`${this.url}/${id}/analizar`, {});
  }

  setStatus(id: number, estado: QuoteStatus): Observable<Quote> {
    return this.http.post<Quote>(`${this.url}/${id}/estado`, { estado });
  }

  similar(id: number, limit = 3): Observable<SimilarQuote[]> {
    return this.http.get<SimilarQuote[]>(`${this.url}/${id}/similares`, { params: { limite: limit } });
  }

  addItem(id: number, item: ItemInput): Observable<Quote> {
    return this.http.post<Quote>(`${this.url}/${id}/items`, item);
  }

  updateItem(id: number, itemId: number, changes: ItemUpdate): Observable<Quote> {
    return this.http.put<Quote>(`${this.url}/${id}/items/${itemId}`, changes);
  }

  removeItem(id: number, itemId: number): Observable<Quote> {
    return this.http.delete<Quote>(`${this.url}/${id}/items/${itemId}`);
  }

  generateProposal(id: number): Observable<{ cotizacion_id: number; propuesta: string }> {
    return this.http.post<{ cotizacion_id: number; propuesta: string }>(`${this.url}/${id}/propuesta`, {});
  }
}
