import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ServRequest, ServResponse } from '../models/servicio';

@Injectable({ providedIn: 'root' })
export class ServicioService {
  private readonly http = inject(HttpClient);

  private url(businessId: string): string {
    return `${environment.apiUrl}/businesses/${businessId}/services`;
  }

  /** Es público: lo usa también el perfil del negocio. */
  listar(businessId: string): Observable<ServResponse[]> {
    return this.http.get<ServResponse[]>(this.url(businessId));
  }

  crear(businessId: string, datos: ServRequest): Observable<ServResponse> {
    return this.http.post<ServResponse>(this.url(businessId), datos);
  }

  actualizar(businessId: string, id: string, datos: ServRequest): Observable<ServResponse> {
    return this.http.put<ServResponse>(`${this.url(businessId)}/${id}`, datos);
  }

  /** Baja lógica. */
  eliminar(businessId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.url(businessId)}/${id}`);
  }
}
