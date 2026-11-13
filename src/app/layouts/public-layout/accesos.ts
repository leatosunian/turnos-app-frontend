import { computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth-service';

// A donde llevan los links "Ingresar" y "Mis turnos" de las paginas publicas, segun haya
// sesion o no. Lo usan el header, el footer y el cierre de la landing, por eso esta aca y no
// repetido en cada uno.
//
// Por que hace falta: /mis-turnos tiene un guard que solo deja pasar a clientes, y a los demas
// los manda a la pantalla de su rol. Entonces un dueño logueado que tocaba "Mis turnos" caia
// en /panel sin entender por que. Y "Ingresar" lo llevaba al login aunque ya tuviera sesion.
//
// Reglas:
// - rutaIngresar: sin sesion va a /ingresar. Con sesion va directo a la pantalla de su rol,
//   la misma que despues del login. Por ejemplo un dueño va a /panel y un cliente a /mis-turnos.
// - veMisTurnos: el link se muestra sin sesion (el guard lo manda a ingresar y despues vuelve)
//   o si el usuario es cliente. A un dueño, empleado o admin no se lo mostramos, porque no
//   tiene turnos sacados como cliente.
//
// Tiene que llamarse en el constructor o en la declaracion de un campo, porque usa inject().
export function accesosDeSesion() {
  const auth = inject(AuthService);
  return {
    rutaIngresar: computed(() => (auth.logueado() ? auth.rutaInicial() : '/ingresar')),
    veMisTurnos: computed(() => !auth.logueado() || auth.tieneRol(['CLIENT'])),
  };
}
