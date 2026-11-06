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
});
