import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import * as api from '../../api/functions';
import { API_URL } from '../config/api.config';
import { AIStatus, ClientQuestions, PriceExplanation, ProposalWording, ScopeReview } from '../models';
import { body } from '../utils/api';
import { errorMessage } from '../utils/http-error';

/** Names shown to the user for the provider the server reports. */
const PROVIDER_LABELS: Record<string, string> = { groq: 'Groq', gemini: 'Gemini' };

/** The AI features of a quote. Our own code calculates the numbers; the AI only writes text. */
@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http = inject(HttpClient);

  /** null while the status has not arrived */
  readonly status = signal<AIStatus | null>(null);
  readonly configured = computed(() => this.status()?.configured ?? false);
  readonly providerLabel = computed(() => {
    const provider = this.status()?.provider ?? '';
    return PROVIDER_LABELS[provider] ?? provider;
  });

  private loading = false;

  /** Asks the server once whether the AI is configured and with which provider. */
  loadStatus(): void {
    if (this.status() || this.loading) return;
    this.loading = true;
    api.aiStatus(this.http, API_URL).pipe(body()).subscribe({
      next: (status) => {
        this.status.set(status);
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  scopeReview(quoteId: number): Observable<ScopeReview> {
    return api.scopeReview(this.http, API_URL, { quote_id: quoteId }).pipe(body());
  }

  explainPrice(quoteId: number): Observable<PriceExplanation> {
    return api.explainPrice(this.http, API_URL, { quote_id: quoteId }).pipe(body());
  }

  clientQuestions(quoteId: number): Observable<ClientQuestions> {
    return api.clientQuestions(this.http, API_URL, { quote_id: quoteId }).pipe(body());
  }

  improveProposal(quoteId: number): Observable<ProposalWording> {
    return api.improveProposal(this.http, API_URL, { quote_id: quoteId }).pipe(body());
  }
}

/** Same as errorMessage, plus how long to wait when the provider's usage limit was reached. */
export function aiErrorMessage(error: unknown): string {
  const message = errorMessage(error);
  if (error instanceof HttpErrorResponse && error.status === 429) {
    const seconds = Number(error.headers.get('Retry-After'));
    if (seconds > 0) return `${message} (puedes reintentar en ${Math.ceil(seconds)} s)`;
  }
  return message;
}
