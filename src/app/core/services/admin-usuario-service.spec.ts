import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AdminUsuarioService } from './admin-usuario-service';

const URL = `${environment.apiUrl}/admin/users`;

describe('AdminUsuarioService', () => {
  let service: AdminUsuarioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminUsuarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar pide todos los usuarios', () => {
    service.listar().subscribe();
    expect(httpMock.expectOne(URL).request.method).toBe('GET');
  });

  it('actualizarRoles hace PATCH con los roles', () => {
    service.actualizarRoles('u-1', ['OWNER', 'ADMIN']).subscribe();
    const req = httpMock.expectOne(`${URL}/u-1/roles`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ roles: ['OWNER', 'ADMIN'] });
  });

  it('alternarActivo usa el DELETE, que en el back activa o desactiva', () => {
    service.alternarActivo('u-1').subscribe();
    expect(httpMock.expectOne(`${URL}/u-1`).request.method).toBe('DELETE');
  });
});
