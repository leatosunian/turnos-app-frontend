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
// - veIngresar: se oculta solo si hay sesion y la pantalla de su rol es /mis-turnos (un
//   cliente). Ahi Ingresar lo llevaria a Mis turnos, que ya esta como link propio. A un dueño o
//   admin se le deja, porque es su acceso al panel. Si tiene CLIENT y OWNER, su ruta es /panel.
//
// - textoIngresar: el texto de ese mismo link. Sin sesion dice Ingresar. Con sesion ya no tiene
//   sentido, porque al lado aparece Cerrar sesion y quedaban los dos juntos: dice Mi panel para
//   el dueño y el empleado, y Administracion para el admin.
//
// Tiene que llamarse en el constructor o en la declaracion de un campo, porque usa inject().
export function accesosDeSesion() {
  const auth = inject(AuthService);
  return {
    rutaIngresar: computed(() => (auth.logueado() ? auth.rutaInicial() : '/ingresar')),
    textoIngresar: computed(() => {
      if (!auth.logueado()) return 'Ingresar';
      return auth.rutaInicial() === '/admin' ? 'Administración' : 'Mi panel';
    }),
    veMisTurnos: computed(() => !auth.logueado() || auth.tieneRol(['CLIENT'])),
    veIngresar: computed(() => !auth.logueado() || auth.rutaInicial() !== '/mis-turnos'),
  };
}
