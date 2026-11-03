import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import * as api from '../../api/functions';
import { SeedResult } from '../../api/models';
import { API_URL } from '../config/api.config';
import { Stats } from '../models';
import { SeedResultSchema, StatsSchema } from '../schemas/api.schemas';
import { parsed } from '../utils/api';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);

  get(): Observable<Stats> {
    return api.myStats(this.http, API_URL).pipe(parsed(StatsSchema, 'el panel'));
  }

  /** Loads the example quotes. With reset=true it first deletes all your quotes. */
  loadExamples(reset: boolean): Observable<SeedResult> {
    return api
      .loadExampleQuotes(this.http, API_URL, { reset })
      .pipe(parsed(SeedResultSchema, 'los ejemplos'));
  }
}
