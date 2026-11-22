import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { errorInterceptor } from './error-interceptor';
import { ApiError } from '../models/api-error';
import { AuthService } from '../services/auth-service';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let cerrarSesion: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cerrarSesion = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { cerrarSesion } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function pedirYCapturar(): ApiError[] {
    const errores: ApiError[] = [];
    http.get('/test').subscribe({ error: (e: ApiError) => errores.push(e) });
    return errores;
  }

  it('usa el mensaje que manda el backend', () => {
    const errores = pedirYCapturar();
    httpMock
      .expectOne('/test')
      .flush(
        { status: 409, message: 'El turno ya no está disponible' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(errores[0]).toEqual({ status: 409, message: 'El turno ya no está disponible' });
  });

  it('reemplaza el mensaje genérico de un 500', () => {
    const errores = pedirYCapturar();
    httpMock
      .expectOne('/test')
      .flush(
        { status: 500, message: 'Internal server error' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(errores[0].status).toBe(500);
    expect(errores[0].message).not.toBe('Internal server error');
  });

  it('informa cuando no hay conexión con el servidor', () => {
    const errores = pedirYCapturar();
    httpMock.expectOne('/test').error(new ProgressEvent('error'));

    expect(errores[0].status).toBe(0);
    expect(errores[0].message).toContain('No se pudo conectar');
  });

  it('usa un mensaje por defecto si la respuesta no trae message', () => {
    const errores = pedirYCapturar();
    httpMock.expectOne('/test').flush(null, { status: 404, statusText: 'Not Found' });

    expect(errores[0].status).toBe(404);
    expect(errores[0].message.length).toBeGreaterThan(0);
  });

  it('con un 401 cierra la sesión', () => {
    const url = `${environment.apiUrl}/users/me/appointments`;
    http.get(url).subscribe({ error: () => {} });
    httpMock
      .expectOne(url)
      .flush(
        { status: 401, message: 'No autorizado' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(cerrarSesion).toHaveBeenCalledWith('/ingresar');
  });

  it('un 403 no cierra la sesión: es falta de permiso, no sesión vencida', () => {
    const url = `${environment.apiUrl}/businesses/n-2`;
    const errores: ApiError[] = [];
    http.get(url).subscribe({ error: (e: ApiError) => errores.push(e) });
    httpMock
      .expectOne(url)
      .flush(
        { status: 403, message: 'No tenés permiso para gestionar este negocio' },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(cerrarSesion).not.toHaveBeenCalled();
    expect(errores[0]).toEqual({
      status: 403,
      message: 'No tenés permiso para gestionar este negocio',
    });
  });

  it('un 401 del login no cierra la sesión ni redirige', () => {
    const url = `${environment.apiUrl}/auth/login`;
    const errores: ApiError[] = [];
    http.post(url, {}).subscribe({ error: (e: ApiError) => errores.push(e) });
    httpMock
      .expectOne(url)
      .flush(
        { status: 401, message: 'Credenciales inválidas' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(cerrarSesion).not.toHaveBeenCalled();
    expect(errores[0].message).toBe('Credenciales inválidas');
  });
});
