import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { RoleName } from '../../../core/models/usuario';
import { AuthService } from '../../../core/services/auth-service';

// roles: quienes ven el link. Si no tiene, lo ve cualquiera que entre a ese layout (asi estan
// los de admin, que ya tiene su propio guard)
interface LinkMenu {
  ruta: string;
  texto: string;
  roles?: RoleName[];
}

interface GrupoMenu {
  titulo?: string;
  links: LinkMenu[];
}

// Todo el panel es del dueño salvo Mis turnos y Mi actividad, que son las pantallas del
// empleado: el back le contesta 403 en la lista de turnos del negocio, servicios, horarios,
// negocio y estadisticas del negocio. Por eso
// a cada link se le dice que rol lo ve, y si alguien es dueño y empleado a la vez ve los dos
const SOLO_DUENO: RoleName[] = ['OWNER'];

const MENU_PANEL: GrupoMenu[] = [
  {
    links: [
      { ruta: '/panel', texto: 'Hoy', roles: SOLO_DUENO },
      { ruta: '/panel/agenda', texto: 'Agenda', roles: SOLO_DUENO },
      { ruta: '/panel/turnos', texto: 'Turnos', roles: SOLO_DUENO },
      { ruta: '/panel/servicios', texto: 'Servicios y equipo', roles: SOLO_DUENO },
      { ruta: '/panel/estadisticas', texto: 'Estadísticas', roles: SOLO_DUENO },
      { ruta: '/panel/mis-turnos', texto: 'Mis turnos', roles: ['EMPLOYEE'] },
      { ruta: '/panel/actividad', texto: 'Mi actividad', roles: ['EMPLOYEE'] },
    ],
  },
  {
    titulo: 'Configuración',
    links: [
      { ruta: '/panel/negocio', texto: 'Mi negocio', roles: SOLO_DUENO },
      { ruta: '/panel/horarios', texto: 'Horarios y plantillas', roles: SOLO_DUENO },
    ],
  },
];

const MENU_ADMIN: GrupoMenu[] = [
  {
    links: [
      { ruta: '/admin', texto: 'Resumen' },
      { ruta: '/admin/usuarios', texto: 'Usuarios' },
      { ruta: '/admin/negocios', texto: 'Negocios' },
      { ruta: '/admin/rubros', texto: 'Rubros' },
    ],
  },
];

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar',
  styleUrl: './sidebar.css',
  templateUrl: './sidebar.html',
})
export class Sidebar {
  private readonly auth = inject(AuthService);

  readonly admin = input(false);

  // Los grupos del menu con los links que puede ver el usuario logueado. Si un grupo se queda
  // sin links no se muestra, si no al empleado le quedaria el titulo Configuracion solo
  protected readonly grupos = computed(() =>
    (this.admin() ? MENU_ADMIN : MENU_PANEL)
      .map((grupo) => ({
        ...grupo,
        links: grupo.links.filter((link) => !link.roles || this.auth.tieneRol(link.roles)),
      }))
      .filter((grupo) => grupo.links.length > 0),
  );

  // El boton de Nuevo turno abre el dialogo de la Agenda, que solo usa el dueño
  protected readonly esDueno = computed(() => this.auth.tieneRol(SOLO_DUENO));

  // Datos de la tarjeta de abajo del sidebar, la del usuario logueado. En el celular esto
  // mismo esta en el menu Mas; en desktop no habia ningun lugar para ver con que cuenta estas
  // ni para cerrar sesion.
  protected readonly usuario = this.auth.usuario;

  // Las letras del cuadradito: la primera letra de las dos primeras palabras del nombre, en
  // mayuscula. Por ejemplo Lucia Fernandez queda LF y un nombre de una sola palabra queda con
  // una letra sola.
  protected readonly iniciales = computed(() =>
    (this.usuario()?.name ?? '')
      .trim()
      .split(/\s+/) // separa por espacios aunque haya mas de uno seguido
      .slice(0, 2)
      .map((palabra) => palabra.charAt(0))
      .join('')
      .toUpperCase(),
  );

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
  }
}
