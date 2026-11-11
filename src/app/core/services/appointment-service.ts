import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse, Pagina, aPagina } from '../models/pagina';
import { AppointmentResponse, AppointmentStatus, BookAppointmentRequest } from '../models/turno';

export interface FiltroTurnos {
  /** Sin estado trae todos. */
  status?: AppointmentStatus | null;
  /** Arranca en 0. */
  page?: number;
  /** El back pagina de a 20 si no se indica. */
  size?: number;
  /** Formato de Spring: `campo,asc` o `campo,desc`. */
  sort?: string;
}

/** Más nuevos primero. */
export const ORDEN_TURNOS = 'startDatetime,desc';

/** Turnos del panel del negocio (Turnos, Hoy y Agenda) y la reserva desde el perfil público. */
@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  /** Turnos del negocio, paginados y filtrables por estado. Solo OWNER y ADMIN. */
  listar(businessId: string, filtro: FiltroTurnos = {}): Observable<Pagina<AppointmentResponse>> {
    let params = new HttpParams()
      .set('page', filtro.page ?? 0)
      .set('size', filtro.size ?? 20)
      .set('sort', filtro.sort ?? ORDEN_TURNOS);
    if (filtro.status) {
      params = params.set('status', filtro.status);
    }
    return this.http
      .get<PageResponse<AppointmentResponse>>(`${this.url}/businesses/${businessId}/appointments`, {
        params,
      })
      .pipe(map(aPagina));
  }

  /** Cantidad de turnos con ese estado (o en total). El back no tiene un endpoint de totales. */
  contar(businessId: string, status?: AppointmentStatus | null): Observable<number> {
    return this.listar(businessId, { status, size: 1 }).pipe(map((pagina) => pagina.total));
  }

  /** Todos los turnos de hoy (libres incluidos), ordenados por hora. Solo OWNER y ADMIN. */
  deHoy(businessId: string): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(
      `${this.url}/businesses/${businessId}/appointments/today`,
    );
  }

  /** Turnos libres (UNBOOKED) que todavía no empezaron. Es público. */
  libres(businessId: string, serviceId?: string): Observable<AppointmentResponse[]> {
    const params = serviceId ? new HttpParams().set('serviceId', serviceId) : undefined;
    return this.http.get<AppointmentResponse[]>(
      `${this.url}/businesses/${businessId}/appointments/public`,
      { params },
    );
  }

  /**
   * Toma un turno libre: queda AWAITING_PAYMENT con la seña PENDING. Es público.
   * Si alguien lo tomó antes, el back responde 409.
   */
  reservar(id: string, datos: BookAppointmentRequest): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(`${this.url}/appointments/${id}/book`, datos);
  }

  /** Solo turnos BOOKED. Le devuelve la seña al cliente. */
  suspender(id: string): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(`${this.url}/appointments/${id}/suspend`, null);
  }

  /** Solo turnos UNBOOKED. */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/appointments/${id}`);
  }
}
