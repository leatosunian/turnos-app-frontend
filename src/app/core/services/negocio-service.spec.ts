import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { BusinessResponse } from '../models/negocio';
import { NegocioService } from './negocio-service';

describe('NegocioService', () => {
  let service: NegocioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NegocioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('miNegocio pide el negocio del dueño logueado', () => {
    let resultado: BusinessResponse | undefined;
    service.miNegocio().subscribe((negocio) => (resultado = negocio));

    const req = httpMock.expectOne(`${environment.apiUrl}/businesses/mine`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'n-1', name: 'Estudio Malbec', slug: 'estudio-malbec' });

    expect(resultado?.slug).toBe('estudio-malbec');
  });

  it('crear hace POST con los datos del negocio', () => {
    const datos = { name: 'Estudio', email: 'a@b.com', slug: 'estudio', phone: '1145550182' };
    service.crear(datos).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/businesses`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    req.flush({});
  });

  it('actualizar hace PUT sobre el negocio', () => {
    const datos = { name: 'Estudio', email: 'a@b.com', slug: 'estudio', phone: '1145550182' };
    service.actualizar('n-1', datos).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/businesses/n-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(datos);
    req.flush({});
  });

  it('asignarRubro y quitarRubro usan el endpoint de types', () => {
    service.asignarRubro('n-1', 'r-1').subscribe();
    service.quitarRubro('n-1', 'r-2').subscribe();

    const url = `${environment.apiUrl}/businesses/n-1/types`;
    expect(httpMock.expectOne(`${url}/r-1`).request.method).toBe('POST');
    expect(httpMock.expectOne(`${url}/r-2`).request.method).toBe('DELETE');
  });
});
