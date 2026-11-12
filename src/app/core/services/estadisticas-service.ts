import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminStatsResponse,
  BusinessStatsResponse,
  EmployeeStatsResponse,
  PeriodoEstadisticas,
  RangoEstadisticas,
} from '../models/estadisticas';

/** Un período predefinido ('MONTH') o un rango de fechas propio. */
export type FiltroEstadisticas = PeriodoEstadisticas | RangoEstadisticas;

function parametros(filtro: FiltroEstadisticas): HttpParams {
  return typeof filtro === 'string'
    ? new HttpParams().set('period', filtro)
    : new HttpParams().set('dateFrom', filtro.desde).set('dateTo', filtro.hasta);
}

/** Estadísticas del negocio (sólo el dueño) y de la plataforma (sólo ADMIN). */
@Injectable({ providedIn: 'root' })
export class EstadisticasService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  delNegocio(businessId: string, filtro: FiltroEstadisticas): Observable<BusinessStatsResponse> {
    return this.http.get<BusinessStatsResponse>(`${this.url}/businesses/${businessId}/stats`, {
      params: parametros(filtro),
    });
  }

  /** Estadísticas de un profesional: de acá salen las horas trabajadas. */
  delEmpleado(
    businessId: string,
    employeeId: string,
    filtro: FiltroEstadisticas,
  ): Observable<EmployeeStatsResponse> {
    return this.http.get<EmployeeStatsResponse>(
      `${this.url}/businesses/${businessId}/stats/employees/${employeeId}`,
      { params: parametros(filtro) },
    );
  }

  /** Estadísticas de toda la plataforma. Sólo ADMIN. */
  deAdmin(filtro: FiltroEstadisticas): Observable<AdminStatsResponse> {
    return this.http.get<AdminStatsResponse>(`${this.url}/admin/stats`, {
      params: parametros(filtro),
    });
  }
}
