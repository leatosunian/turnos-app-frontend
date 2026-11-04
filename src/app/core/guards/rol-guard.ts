import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RoleName } from '../models/usuario';
import { AuthService } from '../services/auth-service';

/**
 * Deja pasar sólo a los usuarios logueados con alguno de los roles indicados.
 * Sin sesión, manda a /ingresar. Con otro rol, manda a la ruta inicial de su rol.
 */
export function rolGuard(roles: RoleName[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.logueado()) {
      return router.createUrlTree(['/ingresar']);
    }
    return auth.tieneRol(roles) ? true : router.parseUrl(auth.rutaInicial());
  };
}
