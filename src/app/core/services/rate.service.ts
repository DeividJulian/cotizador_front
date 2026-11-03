import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import * as api from '../../api/functions';
import { API_URL } from '../config/api.config';
import { MarketRate, Rate, RateInput } from '../models';
import { body } from '../utils/api';

@Injectable({ providedIn: 'root' })
export class RateService {
  private readonly http = inject(HttpClient);

  list(): Observable<Rate[]> {
    return api.listRates(this.http, API_URL).pipe(body());
  }

  create(input: RateInput): Observable<Rate> {
    return api.createRate(this.http, API_URL, { body: input }).pipe(body());
  }

  update(id: number, input: RateInput): Observable<Rate> {
    return api.updateRate(this.http, API_URL, { rate_id: id, body: input }).pipe(body());
  }

  remove(id: number): Observable<unknown> {
    return api.deleteRate(this.http, API_URL, { rate_id: id }).pipe(body());
  }

  /** Replaces all your rates with the market reference ones. */
  resetToMarket(): Observable<Rate[]> {
    return api.resetToMarket(this.http, API_URL).pipe(body());
  }

  market(): Observable<MarketRate[]> {
    return api.marketRates(this.http, API_URL).pipe(body());
  }
}
