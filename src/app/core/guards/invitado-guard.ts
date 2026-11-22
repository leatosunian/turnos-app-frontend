import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

// Guard de /ingresar: deja pasar solo a quien no tiene sesion. Si alguien ya logueado entra a
// mano a /ingresar, o toca "Crear mi negocio" en la landing, lo manda a la pantalla de su rol
// (la misma que despues del login), por ejemplo un dueño va a /panel y un cliente a /mis-turnos.
// Sin esto se le mostraba el formulario de ingreso con la sesion abierta, y si se registraba de
// nuevo el token nuevo pisaba al anterior sin avisar.
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.logueado() ? inject(Router).parseUrl(auth.rutaInicial()) : true;
};
