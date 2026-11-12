import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusinessResponse } from '../models/negocio';

/** Administración de los negocios de la plataforma. Solo ADMIN. */
@Injectable({ providedIn: 'root' })
export class AdminNegocioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/businesses`;

  /** Todos los negocios, incluidos los dados de baja. El back no pagina. */
  listar(): Observable<BusinessResponse[]> {
    return this.http.get<BusinessResponse[]>(this.url);
  }

  /**
   * Baja lógica: el negocio queda con deleted = true y sus empleados inactivos. El back la
   * rechaza si el negocio tiene turnos pendientes.
   */
  darDeBaja(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
