import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusinessTypeResponse } from '../models/negocio';

/** Rubros que eligen los negocios. Listar es público; crear, editar y eliminar, solo ADMIN. */
@Injectable({ providedIn: 'root' })
export class RubroService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/business-types`;

  /** Solo los que no están eliminados. */
  listar(): Observable<BusinessTypeResponse[]> {
    return this.http.get<BusinessTypeResponse[]>(this.url);
  }

  crear(name: string): Observable<BusinessTypeResponse> {
    return this.http.post<BusinessTypeResponse>(this.url, { name });
  }

  editar(id: string, name: string): Observable<BusinessTypeResponse> {
    return this.http.put<BusinessTypeResponse>(`${this.url}/${id}`, { name });
  }

  /** Borrado lógico: deja de aparecer en el registro y en la lista. */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
