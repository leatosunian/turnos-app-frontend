import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ActividadService } from './actividad-service';

const URL = `${environment.apiUrl}/businesses/n-1/stats/employees/e-1`;

describe('ActividadService', () => {
  let service: ActividadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ActividadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('pide los números del período', () => {
    service.delEmpleado('n-1', 'e-1', 'WEEK').subscribe();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('period')).toBe('WEEK');
    expect(req.request.params.has('dateFrom')).toBe(false);
    req.flush({});
  });

  it('con fechas manda dateFrom y dateTo', () => {
    service.delEmpleado('n-1', 'e-1', { from: '2026-10-01', to: '2026-10-31' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('dateFrom')).toBe('2026-10-01');
    expect(req.request.params.get('dateTo')).toBe('2026-10-31');
    expect(req.request.params.has('period')).toBe(false);
    req.flush({});
  });
});
