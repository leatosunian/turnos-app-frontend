import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { RubroService } from './rubro-service';

const URL = `${environment.apiUrl}/business-types`;

describe('RubroService', () => {
  let service: RubroService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RubroService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista, crea, edita y elimina con sus endpoints', () => {
    service.listar().subscribe();
    expect(httpMock.expectOne(URL).request.method).toBe('GET');

    service.crear('Kinesiología').subscribe();
    const crear = httpMock.expectOne(URL);
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual({ name: 'Kinesiología' });

    service.editar('r-1', 'Peluquería').subscribe();
    const editar = httpMock.expectOne(`${URL}/r-1`);
    expect(editar.request.method).toBe('PUT');
    expect(editar.request.body).toEqual({ name: 'Peluquería' });

    service.eliminar('r-1').subscribe();
    expect(httpMock.expectOne(`${URL}/r-1`).request.method).toBe('DELETE');
  });
});
