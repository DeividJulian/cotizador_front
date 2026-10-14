import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import { Client, ClientInput } from '../models';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/clientes`;

  list(): Observable<Client[]> {
    return this.http.get<Client[]>(this.url);
  }

  get(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.url}/${id}`);
  }

  create(input: ClientInput): Observable<Client> {
    return this.http.post<Client>(this.url, input);
  }

  update(id: number, input: ClientInput): Observable<Client> {
    return this.http.put<Client>(`${this.url}/${id}`, input);
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.url}/${id}`);
  }
}
