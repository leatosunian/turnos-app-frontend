import { Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
  readonly admin = input(false);

  protected readonly grupos = computed(() => (this.admin() ? MENU_ADMIN : MENU_PANEL));
}
