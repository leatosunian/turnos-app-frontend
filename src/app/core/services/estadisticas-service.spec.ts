import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { EstadisticasService } from './estadisticas-service';

describe('EstadisticasService', () => {
  it('delNegocio pide las estadísticas del período', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(EstadisticasService);
    const httpMock = TestBed.inject(HttpTestingController);

    service.delNegocio('n-1', 'TODAY').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/businesses/n-1/stats`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('period')).toBe('TODAY');
    req.flush({});
    httpMock.verify();
  });
});
