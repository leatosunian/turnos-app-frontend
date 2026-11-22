import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EmployeeRequest, EmployeeUpdateRequest } from '../models/empleado';
import { UserResponse } from '../models/usuario';

@Injectable({ providedIn: 'root' })
export class EmpleadoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/employees`;

  listar(businessId: string): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(
      `${environment.apiUrl}/businesses/${businessId}/employees`,
    );
  }

  crear(businessId: string, datos: EmployeeRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(
      `${environment.apiUrl}/businesses/${businessId}/employees`,
      datos,
    );
  }

  actualizar(id: string, datos: EmployeeUpdateRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.url}/${id}`, datos);
  }

  /** Lo desasocia del negocio. Responde 409 si tiene turnos pendientes. */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
