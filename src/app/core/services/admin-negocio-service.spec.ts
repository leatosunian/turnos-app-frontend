import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminNegocioService } from './admin-negocio-service';

const URL = `${environment.apiUrl}/businesses`;

describe('AdminNegocioService', () => {
  let service: AdminNegocioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminNegocioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista los negocios', () => {
    service.listar().subscribe();
    expect(httpMock.expectOne(URL).request.method).toBe('GET');
  });

  it('da de baja un negocio con DELETE', () => {
    service.darDeBaja('n-1').subscribe();
    expect(httpMock.expectOne(`${URL}/n-1`).request.method).toBe('DELETE');
  });
});
