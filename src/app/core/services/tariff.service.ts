import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import { Tariff, TariffInput } from '../models';

@Injectable({ providedIn: 'root' })
export class TariffService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/tarifas`;

  list(): Observable<Tariff[]> {
    return this.http.get<Tariff[]>(this.url);
  }

  create(input: TariffInput): Observable<Tariff> {
    return this.http.post<Tariff>(this.url, input);
  }

  update(id: number, input: TariffInput): Observable<Tariff> {
    return this.http.put<Tariff>(`${this.url}/${id}`, input);
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.url}/${id}`);
  }
}
