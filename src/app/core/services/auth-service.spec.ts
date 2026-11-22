import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { UserResponse } from '../models/usuario';
import { AuthService } from './auth-service';

const URL = `${environment.apiUrl}/auth`;

function usuario(roles: UserResponse['roles']): UserResponse {
  return {
    id: 'u-1',
    name: 'Ana',
    email: 'ana@mail.com',
    createdAt: '2026-01-01T10:00:00',
    active: true,
    roles,
  };
}

describe('AuthService', () => {
  let auth: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  function crear(): void {
    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => httpMock.verify());

  it('login guarda el token y carga el usuario con sus roles', () => {
    crear();
    let resultado: UserResponse | undefined;
    auth.login({ email: 'ana@mail.com', password: 'Clave123' }).subscribe((u) => (resultado = u));

    const login = httpMock.expectOne(`${URL}/login`);
    expect(login.request.method).toBe('POST');
    login.flush({ token: 'abc' });
    httpMock.expectOne(`${URL}/me`).flush(usuario(['OWNER']));

    expect(localStorage.getItem('token')).toBe('abc');
    expect(auth.token).toBe('abc');
    expect(resultado?.roles).toEqual(['OWNER']);
    expect(auth.logueado()).toBe(true);
  });

  it('registrar y registrarCliente usan su endpoint', () => {
    crear();
    const datos = { name: 'Ana', email: 'ana@mail.com', password: 'Clave123' };

    auth.registrar(datos).subscribe();
    httpMock.expectOne(`${URL}/register`).flush({ token: 'abc' });
    httpMock.expectOne(`${URL}/me`).flush(usuario(['OWNER']));

    auth.registrarCliente(datos).subscribe();
    httpMock.expectOne(`${URL}/register/client`).flush({ token: 'def' });
    httpMock.expectOne(`${URL}/me`).flush(usuario(['CLIENT']));

    expect(auth.usuario()?.roles).toEqual(['CLIENT']);
  });

  it('si falla /me después del login, no deja la sesión a medias', () => {
    crear();
    auth.login({ email: 'ana@mail.com', password: 'Clave123' }).subscribe({ error: () => {} });
    httpMock.expectOne(`${URL}/login`).flush({ token: 'abc' });
    httpMock.expectOne(`${URL}/me`).flush(null, { status: 500, statusText: 'Error' });

    expect(auth.token).toBeNull();
    expect(auth.logueado()).toBe(false);
  });

  it('restaurarSesion recupera el usuario si hay un token guardado', () => {
    localStorage.setItem('token', 'abc');
    crear();
    auth.restaurarSesion().subscribe();
    httpMock.expectOne(`${URL}/me`).flush(usuario(['CLIENT']));

    expect(auth.logueado()).toBe(true);
  });

  it('restaurarSesion descarta el token vencido', () => {
    localStorage.setItem('token', 'vencido');
    crear();
    let resultado: UserResponse | null | undefined;
    auth.restaurarSesion().subscribe((u) => (resultado = u));
    httpMock.expectOne(`${URL}/me`).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(resultado).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('restaurarSesion también descarta el token si el back responde 403', () => {
    localStorage.setItem('token', 'de-un-usuario-borrado');
    crear();
    auth.restaurarSesion().subscribe();
    httpMock.expectOne(`${URL}/me`).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(localStorage.getItem('token')).toBeNull();
    expect(auth.logueado()).toBe(false);
  });

  it('restaurarSesion mantiene el token si el back no responde', () => {
    localStorage.setItem('token', 'abc');
    crear();
    auth.restaurarSesion().subscribe();
    httpMock.expectOne(`${URL}/me`).flush(null, { status: 0, statusText: 'Unknown Error' });

    expect(localStorage.getItem('token')).toBe('abc');
  });

  it('restaurarSesion no llama al back si no hay token', () => {
    crear();
    auth.restaurarSesion().subscribe();
    httpMock.expectNone(`${URL}/me`);
  });

  it('cerrarSesion borra el token y va al home', () => {
    localStorage.setItem('token', 'abc');
    crear();
    auth.cerrarSesion();

    expect(localStorage.getItem('token')).toBeNull();
    expect(auth.logueado()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('cerrarSesion va al destino que se le pasa', () => {
    localStorage.setItem('token', 'abc');
    crear();
    auth.cerrarSesion('/ingresar');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/ingresar');
  });

  it.each([
    [['OWNER'], '/panel'],
    [['EMPLOYEE'], '/panel/actividad'],
    [['ADMIN'], '/admin'],
    [['CLIENT'], '/mis-turnos'],
    [['CLIENT', 'ADMIN'], '/admin'],
  ] as [UserResponse['roles'], string][])('rutaInicial de %j es %s', (roles, ruta) => {
    localStorage.setItem('token', 'abc');
    crear();
    auth.restaurarSesion().subscribe();
    httpMock.expectOne(`${URL}/me`).flush(usuario(roles));

    expect(auth.rutaInicial()).toBe(ruta);
  });
});
