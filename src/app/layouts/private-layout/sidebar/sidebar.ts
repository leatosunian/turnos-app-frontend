import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';

interface GrupoMenu {
  titulo?: string;
  links: { ruta: string; texto: string }[];
}

const MENU_PANEL: GrupoMenu[] = [
  {
    links: [
      { ruta: '/panel', texto: 'Hoy' },
      { ruta: '/panel/agenda', texto: 'Agenda' },
      { ruta: '/panel/turnos', texto: 'Turnos' },
      { ruta: '/panel/servicios', texto: 'Servicios' },
      { ruta: '/panel/estadisticas', texto: 'Estadísticas' },
    ],
  },
  {
    titulo: 'Configuración',
    links: [
      { ruta: '/panel/negocio', texto: 'Mi negocio' },
      { ruta: '/panel/horarios', texto: 'Horarios y plantillas' },
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

  protected readonly grupos = computed(() => (this.admin() ? MENU_ADMIN : MENU_PANEL));

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
