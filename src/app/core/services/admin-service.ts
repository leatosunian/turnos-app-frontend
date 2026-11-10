import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusinessResponse } from '../models/negocio';
import { UserResponse } from '../models/usuario';

/** Lo que usa el panel de administración. Todo es solo ADMIN. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  /** Todos los negocios, incluidos los dados de baja. El back no pagina. */
  negocios(): Observable<BusinessResponse[]> {
    return this.http.get<BusinessResponse[]>(`${this.url}/businesses`);
  }

  /**
   * Baja lógica: el negocio queda con deleted = true y sus empleados inactivos. El back la
   * rechaza si el negocio tiene turnos pendientes.
   */
  darDeBajaNegocio(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/businesses/${id}`);
  }

  /** Todos los usuarios. Se usa para mostrar el nombre del dueño de cada negocio. */
  usuarios(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.url}/admin/users`);
  }
}
