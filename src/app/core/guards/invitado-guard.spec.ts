import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { AuthService } from '../services/auth-service';
import { invitadoGuard } from './invitado-guard';

describe('invitadoGuard', () => {
  let logueado: boolean;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { logueado: () => logueado, rutaInicial: () => '/panel' },
        },
      ],
    });
  });

  function ejecutar() {
    return TestBed.runInInjectionContext(() =>
      invitadoGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }

  it('sin sesión deja entrar a /ingresar', () => {
    logueado = false;
    expect(ejecutar()).toBe(true);
  });

  it('con sesión manda a la pantalla de su rol', () => {
    logueado = true;
    const resultado = ejecutar() as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(resultado)).toBe('/panel');
  });
});
