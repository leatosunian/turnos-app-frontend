import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RoleName, UserResponse } from '../models/usuario';

/** Administración de usuarios de la plataforma. Solo ADMIN. */
@Injectable({ providedIn: 'root' })
export class AdminUsuarioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/users`;

  /** Todos los usuarios. El back no pagina ni filtra: se hace en el front. */
  listar(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.url);
  }

  actualizarRoles(id: string, roles: RoleName[]): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.url}/${id}/roles`, { roles });
  }

  /**
   * Activa o desactiva la cuenta. Ojo: en el back es un DELETE, pero no borra; alterna el estado.
   * Responde 409 si el usuario tiene turnos pendientes.
   */
  alternarActivo(id: string): Observable<UserResponse> {
    return this.http.delete<UserResponse>(`${this.url}/${id}`);
  }
}
