import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusinessResponse } from '../models/negocio';

@Injectable({ providedIn: 'root' })
export class NegocioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/businesses`;

  /**
   * Negocio del dueño logueado. Solo OWNER y ADMIN.
   * Si todavía no creó uno, el back responde 404.
   */
  miNegocio(): Observable<BusinessResponse> {
    return this.http.get<BusinessResponse>(`${this.url}/mine`);
  }
}
