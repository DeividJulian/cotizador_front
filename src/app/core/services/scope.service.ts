import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import { ScopeEstimate } from '../models';

/** Vista previa del análisis de alcance: no guarda nada en la base de datos. */
@Injectable({ providedIn: 'root' })
export class ScopeService {
  private readonly http = inject(HttpClient);

  estimate(descripcion_alcance: string): Observable<ScopeEstimate> {
    return this.http.post<ScopeEstimate>(`${API_URL}/alcance/estimar`, { descripcion_alcance });
  }
}
