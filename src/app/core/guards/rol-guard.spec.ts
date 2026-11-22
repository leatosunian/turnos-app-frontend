import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { RoleName } from '../models/usuario';
import { AuthService } from '../services/auth-service';
import { rolGuard } from './rol-guard';

describe('rolGuard', () => {
  let logueado: boolean;
  let roles: RoleName[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            logueado: () => logueado,
            tieneRol: (permitidos: RoleName[]) => roles.some((r) => permitidos.includes(r)),
            rutaInicial: () => '/mis-turnos',
          },
        },
      ],
    });
  });

  function ejecutar(permitidos: RoleName[]) {
    return TestBed.runInInjectionContext(() =>
      rolGuard(permitidos)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }

  function url(resultado: unknown): string {
    return TestBed.inject(Router).serializeUrl(resultado as UrlTree);
  }

  it('sin sesión manda a /ingresar', () => {
    logueado = false;
    roles = [];
    expect(url(ejecutar(['OWNER']))).toBe('/ingresar');
  });

  it('deja pasar si tiene el rol', () => {
    logueado = true;
    roles = ['OWNER'];
    expect(ejecutar(['OWNER', 'EMPLOYEE'])).toBe(true);
  });

  it('con otro rol manda a la ruta inicial de su rol', () => {
    logueado = true;
    roles = ['CLIENT'];
    expect(url(ejecutar(['ADMIN']))).toBe('/mis-turnos');
  });
});
