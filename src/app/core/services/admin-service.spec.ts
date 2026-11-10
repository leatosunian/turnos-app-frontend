import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminService } from './admin-service';

const URL = environment.apiUrl;

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista negocios y usuarios', () => {
    service.negocios().subscribe();
    expect(httpMock.expectOne(`${URL}/businesses`).request.method).toBe('GET');

    service.usuarios().subscribe();
    expect(httpMock.expectOne(`${URL}/admin/users`).request.method).toBe('GET');
  });

  it('da de baja un negocio con DELETE', () => {
    service.darDeBajaNegocio('n-1').subscribe();
    expect(httpMock.expectOne(`${URL}/businesses/n-1`).request.method).toBe('DELETE');
  });
});
