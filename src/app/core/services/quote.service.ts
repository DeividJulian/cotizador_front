import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

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
import { body } from '../utils/api';

/** Quotes, their items and the proposal, through the client generated from the contract. */
@Injectable({ providedIn: 'root' })
export class QuoteService {
  private readonly http = inject(HttpClient);

  list(status?: QuoteStatus | ''): Observable<QuoteSummary[]> {
    return api.listQuotes(this.http, API_URL, { status: status || null }).pipe(body());
  }

  get(id: number): Observable<Quote> {
    return api.readQuote(this.http, API_URL, { quote_id: id }).pipe(body());
  }

  create(input: QuoteCreate): Observable<Quote> {
    return api.createQuote(this.http, API_URL, { body: input }).pipe(body());
  }

  update(id: number, input: QuoteUpdate): Observable<Quote> {
    return api.updateQuote(this.http, API_URL, { quote_id: id, body: input }).pipe(body());
  }

  remove(id: number): Observable<unknown> {
    return api.deleteQuote(this.http, API_URL, { quote_id: id }).pipe(body());
  }

  /** Runs the scope analysis: detects modules, estimates hours (PERT) and calculates the price. */
  analyze(id: number): Observable<Quote> {
    return api.analyzeQuote(this.http, API_URL, { quote_id: id }).pipe(body());
  }

  setStatus(id: number, status: QuoteStatus): Observable<Quote> {
    return api.changeStatus(this.http, API_URL, { quote_id: id, body: { status } }).pipe(body());
  }

  similar(id: number, limit = 3): Observable<SimilarQuote[]> {
    return api.similarQuotes(this.http, API_URL, { quote_id: id, limit }).pipe(body());
  }

  addItem(id: number, item: ItemInput): Observable<Quote> {
    return api.addItem(this.http, API_URL, { quote_id: id, body: item }).pipe(body());
  }

  updateItem(id: number, itemId: number, changes: ItemUpdate): Observable<Quote> {
    return api.updateItem(this.http, API_URL, { quote_id: id, item_id: itemId, body: changes }).pipe(body());
  }

  removeItem(id: number, itemId: number): Observable<Quote> {
    return api.deleteItem(this.http, API_URL, { quote_id: id, item_id: itemId }).pipe(body());
  }

  /** Replaces the text of some proposal sections; the server rejects any change of figures. */
  updateProposalSections(id: number, sections: { heading: string; text: string }[]): Observable<ProposalOut> {
    return api.updateProposalSections(this.http, API_URL, { quote_id: id, body: { sections } }).pipe(body());
  }

  generateProposal(id: number): Observable<ProposalOut> {
    return api.generateProposal(this.http, API_URL, { quote_id: id }).pipe(body());
  }
}
