import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusinessTypeResponse } from '../models/negocio';

@Injectable({ providedIn: 'root' })
export class RubroService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/business-types`;

  /** Rubros activos. Es público. */
  listar(): Observable<BusinessTypeResponse[]> {
    return this.http.get<BusinessTypeResponse[]>(this.url);
  }
}
