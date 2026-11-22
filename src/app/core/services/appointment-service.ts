import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse, Pagina, aPagina } from '../models/pagina';
import {
  AppointmentResponse,
  AppointmentStatus,
  BookAppointmentRequest,
  CreateAppointmentRequest,
} from '../models/turno';

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

// Filtros de la lista de turnos del empleado (Mis turnos del panel). Las fechas van como
// yyyy-MM-dd y las dos cuentan enteras, por ejemplo desde 2026-11-14 hasta 2026-11-14 es solo
// ese dia. Sin fechas trae todos
export interface FiltroTurnosEmpleado extends FiltroTurnos {
  desde?: string;
  hasta?: string;
}

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

  // Crea un turno suelto desde la Agenda, libre o a nombre de un cliente. Solo OWNER y ADMIN.
  // El back lo marca como manual, asi que regenerar la agenda no lo borra
  crear(businessId: string, datos: CreateAppointmentRequest): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(
      `${this.url}/businesses/${businessId}/appointments`,
      datos,
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

  /**
   * Un turno por id. Es público: lo usa /reserva/:id para mostrar la reserva aunque se abra el
   * link en otro dispositivo. Sin ser el cliente, el dueño o un admin, los datos del cliente
   * vienen en null. 404 si no existe.
   */
  porId(id: string): Observable<AppointmentResponse> {
    return this.http.get<AppointmentResponse>(`${this.url}/appointments/${id}`);
  }

  /** Solo turnos BOOKED. Le devuelve la seña al cliente. */
  suspender(id: string): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(`${this.url}/appointments/${id}/suspend`, null);
  }

  /**
   * Paga la seña de un turno AWAITING_PAYMENT y lo deja BOOKED. Es público: lo usa el cliente
   * desde /reserva/:id. Por ahora es un pago simulado (Mercado Pago es FUTURO).
   */
  pagarSena(id: string): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(`${this.url}/appointments/${id}/pay-deposit`, null);
  }

  /** Solo turnos UNBOOKED. */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/appointments/${id}`);
  }

  // Turnos asignados al empleado logueado, de cualquier estado, paginados. Solo EMPLOYEE: el
  // back saca el empleado del token, asi que nunca devuelve los de un compañero. Lo usa la
  // pantalla Mis turnos. Por defecto vienen del mas viejo al mas nuevo
  deEmpleado(filtro: FiltroTurnosEmpleado = {}): Observable<Pagina<AppointmentResponse>> {
    let params = new HttpParams()
      .set('page', filtro.page ?? 0)
      .set('size', filtro.size ?? 20)
      .set('sort', filtro.sort ?? 'startDatetime,asc');
    if (filtro.status) params = params.set('status', filtro.status);
    if (filtro.desde) params = params.set('dateFrom', filtro.desde);
    if (filtro.hasta) params = params.set('dateTo', filtro.hasta);
    return this.http
      .get<PageResponse<AppointmentResponse>>(`${this.url}/employees/me/appointments`, { params })
      .pipe(map(aPagina));
  }

  /** Turnos del cliente con sesión, más nuevos primero. Solo CLIENT. */
  misTurnos(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.url}/users/me/appointments`);
  }

  /**
   * Cancela un turno BOOKED o AWAITING_PAYMENT. En uno BOOKED el back devuelve la seña
   * (REFUNDED) si faltan 24 h o más; si no, el negocio se la queda (FORFEITED).
   */
  cancelar(id: string): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(`${this.url}/appointments/${id}/cancel`, null);
  }
}
