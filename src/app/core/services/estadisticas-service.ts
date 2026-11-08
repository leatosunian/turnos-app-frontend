import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusinessStatsResponse, PeriodoEstadisticas } from '../models/estadisticas';

/** Estadísticas del negocio. Solo el dueño del negocio. Lo usan Hoy y Estadísticas. */
@Injectable({ providedIn: 'root' })
export class EstadisticasService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  delNegocio(businessId: string, periodo: PeriodoEstadisticas): Observable<BusinessStatsResponse> {
    return this.http.get<BusinessStatsResponse>(`${this.url}/businesses/${businessId}/stats`, {
      params: new HttpParams().set('period', periodo),
    });
  }
}
