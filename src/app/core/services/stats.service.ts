import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import { Stats } from '../models';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);

  get(): Observable<Stats> {
    return this.http.get<Stats>(`${API_URL}/stats`);
  }

  /** Loads the example quotes. With reset=true it first deletes all your quotes. */
  loadExamples(reset: boolean): Observable<unknown> {
    return this.http.post(`${API_URL}/seed`, {}, { params: { reset } });
  }
}
