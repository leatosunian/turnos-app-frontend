import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusinessRequest, BusinessResponse } from '../models/negocio';

@Injectable({ providedIn: 'root' })
export class NegocioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/businesses`;

  /**
   * Negocio del dueño logueado. Solo OWNER y ADMIN.
   * Si todavía no creó uno, el back responde 404.
   */
  miNegocio(): Observable<BusinessResponse> {
    return this.http.get<BusinessResponse>(`${this.url}/mine`);
  }

  /** Crea el negocio del dueño logueado. Un dueño sólo puede tener uno. */
  crear(datos: BusinessRequest): Observable<BusinessResponse> {
    return this.http.post<BusinessResponse>(this.url, datos);
  }

  /** El back reemplaza todos los datos, así que hay que mandar el BusinessRequest completo. */
  actualizar(id: string, datos: BusinessRequest): Observable<BusinessResponse> {
    return this.http.put<BusinessResponse>(`${this.url}/${id}`, datos);
  }

  asignarRubro(id: string, rubroId: string): Observable<BusinessResponse> {
    return this.http.post<BusinessResponse>(`${this.url}/${id}/types/${rubroId}`, null);
  }

  quitarRubro(id: string, rubroId: string): Observable<BusinessResponse> {
    return this.http.delete<BusinessResponse>(`${this.url}/${id}/types/${rubroId}`);
  }
}
