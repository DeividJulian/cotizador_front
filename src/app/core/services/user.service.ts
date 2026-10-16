import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import { Role, User } from '../models';

/** Gestión de cuentas (solo administradores). */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/usuarios`;

  list(): Observable<User[]> {
    return this.http.get<User[]>(this.url);
  }

  setRole(id: number, rol: Role): Observable<User> {
    return this.http.put<User>(`${this.url}/${id}/rol`, { rol });
  }
}
