import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import * as api from '../../api/functions';
import { API_URL } from '../config/api.config';
import { Stats } from '../models';
import { StatsSchema } from '../schemas/api.schemas';
import { parsed } from '../utils/api';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);

  get(): Observable<Stats> {
    return api.myStats(this.http, API_URL).pipe(parsed(StatsSchema, 'el panel'));
  }
}
