import { Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

type Icono = 'hoy' | 'agenda' | 'metricas' | 'usuarios' | 'negocios' | 'rubros';

const LINKS_PANEL: { ruta: string; texto: string; icono: Icono }[] = [
  { ruta: '/panel', texto: 'Hoy', icono: 'hoy' },
  { ruta: '/panel/agenda', texto: 'Agenda', icono: 'agenda' },
  { ruta: '/panel/estadisticas', texto: 'Métricas', icono: 'metricas' },
];

const LINKS_ADMIN: { ruta: string; texto: string; icono: Icono }[] = [
  { ruta: '/admin', texto: 'Resumen', icono: 'metricas' },
  { ruta: '/admin/usuarios', texto: 'Usuarios', icono: 'usuarios' },
  { ruta: '/admin/negocios', texto: 'Negocios', icono: 'negocios' },
  { ruta: '/admin/rubros', texto: 'Rubros', icono: 'rubros' },
];

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-barra-inferior',
  styleUrl: './barra-inferior.css',
  templateUrl: './barra-inferior.html',
})
export class BarraInferior {
  readonly admin = input(false);

  protected readonly links = computed(() => (this.admin() ? LINKS_ADMIN : LINKS_PANEL));
}
