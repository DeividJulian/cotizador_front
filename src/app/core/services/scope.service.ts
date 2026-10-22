import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import { Financials, ScopeEstimate, SimulationInput } from '../models';

/** Previews that save nothing: scope analysis and the price of some hours. */
@Injectable({ providedIn: 'root' })
export class ScopeService {
  private readonly http = inject(HttpClient);

  estimate(scope_description: string): Observable<ScopeEstimate> {
    return this.http.post<ScopeEstimate>(`${API_URL}/scope/estimate`, { scope_description });
  }

  /** Price of the given hours by role with the user's rates and these parameters. */
  simulatePrice(input: SimulationInput): Observable<Financials> {
    return this.http.post<Financials>(`${API_URL}/finance/simulate`, input);
  }
}
