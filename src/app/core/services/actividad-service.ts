import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EmployeeStatsResponse, PeriodoActividad, PeriodoFechas } from '../models/actividad';

/** Números de un profesional. El back solo deja verlos al dueño o al mismo empleado. */
@Injectable({ providedIn: 'root' })
export class ActividadService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  /** Con un período (WEEK, MONTH, YEAR) o con fechas exactas, para comparar. */
  delEmpleado(
    businessId: string,
    employeeId: string,
    periodo: PeriodoActividad | PeriodoFechas,
  ): Observable<EmployeeStatsResponse> {
    const params =
      typeof periodo === 'string'
        ? new HttpParams().set('period', periodo)
        : new HttpParams().set('dateFrom', periodo.from).set('dateTo', periodo.to);
    return this.http.get<EmployeeStatsResponse>(
      `${this.url}/businesses/${businessId}/stats/employees/${employeeId}`,
      { params },
    );
  }
}
