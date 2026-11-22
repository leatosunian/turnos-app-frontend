import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { ServicioService } from './servicio-service';

const URL = `${environment.apiUrl}/businesses/n-1/services`;
const DATOS = { name: 'Corte', durationMinutes: 30, price: 9000, depositPorcentage: 30 };

describe('ServicioService', () => {
  let service: ServicioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ServicioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar pide los servicios del negocio', () => {
    service.listar('n-1').subscribe();
    expect(httpMock.expectOne(URL).request.method).toBe('GET');
  });

  it('crear hace POST con los datos', () => {
    service.crear('n-1', DATOS).subscribe();
    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(DATOS);
  });

  it('actualizar hace PUT sobre el servicio', () => {
    service.actualizar('n-1', 's-1', DATOS).subscribe();
    const req = httpMock.expectOne(`${URL}/s-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(DATOS);
  });

  it('eliminar hace DELETE sobre el servicio', () => {
    service.eliminar('n-1', 's-1').subscribe();
    expect(httpMock.expectOne(`${URL}/s-1`).request.method).toBe('DELETE');
  });
});
