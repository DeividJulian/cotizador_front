import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import * as api from '../../api/functions';
import { API_URL } from '../config/api.config';
import { Financials, ScopeEstimate, SimulationInput } from '../models';
import { FinancialsSchema, ScopeEstimateSchema } from '../schemas/api.schemas';
import { parsed } from '../utils/api';

/** Previews that save nothing: scope analysis and the price of some hours. */
@Injectable({ providedIn: 'root' })
export class ScopeService {
  private readonly http = inject(HttpClient);

  estimate(scope_description: string): Observable<ScopeEstimate> {
    return api
      .estimateScope(this.http, API_URL, { body: { scope_description } })
      .pipe(parsed(ScopeEstimateSchema, 'la vista previa del alcance'));
  }

  /** Price of the given hours by role with the user's rates and these parameters. */
  simulatePrice(input: SimulationInput): Observable<Financials> {
    return api
      .simulatePrice(this.http, API_URL, { body: input })
      .pipe(parsed(FinancialsSchema, 'el precio'));
  }
}
