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

  it('delNegocio con un rango manda dateFrom y dateTo', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(EstadisticasService);
    const httpMock = TestBed.inject(HttpTestingController);

    service.delNegocio('n-1', { desde: '2026-10-01', hasta: '2026-10-28' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/businesses/n-1/stats`);
    expect(req.request.params.get('dateFrom')).toBe('2026-10-01');
    expect(req.request.params.get('dateTo')).toBe('2026-10-28');
    expect(req.request.params.has('period')).toBe(false);
    req.flush({});
    httpMock.verify();
  });

  it('delEmpleado pide las estadísticas del profesional', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(EstadisticasService);
    const httpMock = TestBed.inject(HttpTestingController);

    service.delEmpleado('n-1', 'e-1', 'WEEK').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/businesses/n-1/stats/employees/e-1`,
    );
    expect(req.request.params.get('period')).toBe('WEEK');
    req.flush({});
    httpMock.verify();
  });
});
