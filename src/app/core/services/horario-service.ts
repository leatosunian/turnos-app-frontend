import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AppointmentScheduleRequest,
  AppointmentScheduleResponse,
  DayScheduleResponse,
  DayScheduleUpdateRequest,
} from '../models/horario';

// Pedidos de la pantalla de Horarios: los dias de atencion (schedule) y los turnos programados
// de la plantilla semanal (appointment-schedules). Todo es solo para OWNER.
@Injectable({ providedIn: 'root' })
export class HorarioService {
  private readonly http = inject(HttpClient);

  private url(businessId: string): string {
    return `${environment.apiUrl}/businesses/${businessId}`;
  }

  // Los 7 dias del negocio. Ojo que el back los devuelve desordenados (DOM, JUE, LUN...),
  // la pantalla los ordena con ordenarSemana
  semana(businessId: string): Observable<DayScheduleResponse[]> {
    return this.http.get<DayScheduleResponse[]>(`${this.url(businessId)}/schedule`);
  }

  // Guarda los dias que van en la lista y devuelve solo esos, ya actualizados.
  // Si la hora de fin no es posterior a la de inicio el back responde 400
  guardarDias(
    businessId: string,
    dias: DayScheduleUpdateRequest[],
  ): Observable<DayScheduleResponse[]> {
    return this.http.put<DayScheduleResponse[]>(`${this.url(businessId)}/schedule`, dias);
  }

  plantilla(businessId: string): Observable<AppointmentScheduleResponse[]> {
    return this.http.get<AppointmentScheduleResponse[]>(
      `${this.url(businessId)}/appointment-schedules`,
    );
  }

  // Si choca con otro del mismo dia y profesional el back responde 409, y si el rango no alcanza
  // para la duracion del servicio, 400. Con la agenda automatica prendida, el back regenera los
  // turnos libres en el momento
  crearTurnoProgramado(
    businessId: string,
    datos: AppointmentScheduleRequest,
  ): Observable<AppointmentScheduleResponse> {
    return this.http.post<AppointmentScheduleResponse>(
      `${this.url(businessId)}/appointment-schedules`,
      datos,
    );
  }

  editarTurnoProgramado(
    businessId: string,
    id: string,
    datos: AppointmentScheduleRequest,
  ): Observable<AppointmentScheduleResponse> {
    return this.http.put<AppointmentScheduleResponse>(
      `${this.url(businessId)}/appointment-schedules/${id}`,
      datos,
    );
  }

  eliminarTurnoProgramado(businessId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.url(businessId)}/appointment-schedules/${id}`);
  }

  // Boton "Generar turnos ahora": borra los turnos libres futuros y los vuelve a crear con la
  // plantilla actual. No devuelve nada, asi que para decir cuantos se crearon la pantalla
  // cuenta los turnos libres antes y despues
  generar(businessId: string): Observable<void> {
    return this.http.post<void>(`${this.url(businessId)}/appointment-schedules/generate`, null);
  }
}
