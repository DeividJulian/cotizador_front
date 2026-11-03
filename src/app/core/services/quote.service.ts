import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import * as z from 'zod/mini';

import * as api from '../../api/functions';
import { ProposalOut } from '../../api/models';
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
import {
  MessageSchema,
  ProposalSchema,
  QuoteSchema,
  QuoteSummarySchema,
  SimilarQuoteSchema,
} from '../schemas/api.schemas';
import { parsed } from '../utils/api';

/** Quotes, their items and the proposal, through the client generated from the contract. */
@Injectable({ providedIn: 'root' })
export class QuoteService {
  private readonly http = inject(HttpClient);

  list(status?: QuoteStatus | ''): Observable<QuoteSummary[]> {
    return api
      .listQuotes(this.http, API_URL, { status: status || null })
      .pipe(parsed(z.array(QuoteSummarySchema), 'la lista de cotizaciones'));
  }

  get(id: number): Observable<Quote> {
    return api
      .readQuote(this.http, API_URL, { quote_id: id })
      .pipe(parsed(QuoteSchema, 'la cotización'));
  }

  create(input: QuoteCreate): Observable<Quote> {
    return api
      .createQuote(this.http, API_URL, { body: input })
      .pipe(parsed(QuoteSchema, 'la cotización'));
  }

  update(id: number, input: QuoteUpdate): Observable<Quote> {
    return api
      .updateQuote(this.http, API_URL, { quote_id: id, body: input })
      .pipe(parsed(QuoteSchema, 'la cotización'));
  }

  remove(id: number): Observable<unknown> {
    return api
      .deleteQuote(this.http, API_URL, { quote_id: id })
      .pipe(parsed(MessageSchema, 'la confirmación'));
  }

  /** Runs the scope analysis: detects modules, estimates hours (PERT) and calculates the price. */
  analyze(id: number): Observable<Quote> {
    return api
      .analyzeQuote(this.http, API_URL, { quote_id: id })
      .pipe(parsed(QuoteSchema, 'la cotización'));
  }

  setStatus(id: number, status: QuoteStatus): Observable<Quote> {
    return api
      .changeStatus(this.http, API_URL, { quote_id: id, body: { status } })
      .pipe(parsed(QuoteSchema, 'la cotización'));
  }

  similar(id: number, limit = 3): Observable<SimilarQuote[]> {
    return api
      .similarQuotes(this.http, API_URL, { quote_id: id, limit })
      .pipe(parsed(z.array(SimilarQuoteSchema), 'las cotizaciones parecidas'));
  }

  addItem(id: number, item: ItemInput): Observable<Quote> {
    return api
      .addItem(this.http, API_URL, { quote_id: id, body: item })
      .pipe(parsed(QuoteSchema, 'la cotización'));
  }

  updateItem(id: number, itemId: number, changes: ItemUpdate): Observable<Quote> {
    return api
      .updateItem(this.http, API_URL, { quote_id: id, item_id: itemId, body: changes })
      .pipe(parsed(QuoteSchema, 'la cotización'));
  }

  removeItem(id: number, itemId: number): Observable<Quote> {
    return api
      .deleteItem(this.http, API_URL, { quote_id: id, item_id: itemId })
      .pipe(parsed(QuoteSchema, 'la cotización'));
  }

  /** Replaces the text of some proposal sections; the server rejects any change of figures. */
  updateProposalSections(
    id: number,
    sections: { heading: string; text: string }[],
  ): Observable<ProposalOut> {
    return api
      .updateProposalSections(this.http, API_URL, { quote_id: id, body: { sections } })
      .pipe(parsed(ProposalSchema, 'la propuesta'));
  }

  generateProposal(id: number): Observable<ProposalOut> {
    return api
      .generateProposal(this.http, API_URL, { quote_id: id })
      .pipe(parsed(ProposalSchema, 'la propuesta'));
  }
}
