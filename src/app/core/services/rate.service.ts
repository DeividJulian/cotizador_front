import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import { Rate, RateInput } from '../models';

@Injectable({ providedIn: 'root' })
export class RateService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/rates`;

  list(): Observable<Rate[]> {
    return this.http.get<Rate[]>(this.url);
  }

  create(input: RateInput): Observable<Rate> {
    return this.http.post<Rate>(this.url, input);
  }

  update(id: number, input: RateInput): Observable<Rate> {
    return this.http.put<Rate>(`${this.url}/${id}`, input);
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.url}/${id}`);
  }

  /** Replaces all your rates with the market reference ones. */
  resetToMarket(): Observable<Rate[]> {
    return this.http.post<Rate[]>(`${this.url}/reset`, {});
  }

  market(): Observable<RateInput[]> {
    return this.http.get<RateInput[]>(`${this.url}/market`);
  }
}
