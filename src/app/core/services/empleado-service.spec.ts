import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { EmpleadoService } from './empleado-service';

const API = environment.apiUrl;
const DATOS = { name: 'Lucia Morales', email: 'lucia@mail.com', password: 'Clave123' };

describe('EmpleadoService', () => {
  let service: EmpleadoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmpleadoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar pide el equipo del negocio', () => {
    service.listar('n-1').subscribe();
    expect(httpMock.expectOne(`${API}/businesses/n-1/employees`).request.method).toBe('GET');
  });

  it('crear hace POST en el negocio', () => {
    service.crear('n-1', DATOS).subscribe();
    const req = httpMock.expectOne(`${API}/businesses/n-1/employees`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(DATOS);
  });

  it('actualizar y eliminar usan /employees/{id}', () => {
    service.actualizar('e-1', DATOS).subscribe();
    service.eliminar('e-2').subscribe();
    expect(httpMock.expectOne(`${API}/employees/e-1`).request.method).toBe('PUT');
    expect(httpMock.expectOne(`${API}/employees/e-2`).request.method).toBe('DELETE');
  });
});
