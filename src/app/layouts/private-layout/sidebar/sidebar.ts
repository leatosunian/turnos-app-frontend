import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar',
  styleUrl: './sidebar.css',
  templateUrl: './sidebar.html',
})
export class Sidebar {
  readonly abierto = input(false);
  readonly cerrar = output();

  protected readonly links = [
    { ruta: '/panel', texto: 'Inicio' },
    { ruta: '/panel/turnos', texto: 'Turnos' },
    { ruta: '/panel/servicios', texto: 'Servicios' },
    { ruta: '/panel/agenda', texto: 'Agenda' },
    { ruta: '/panel/empleados', texto: 'Empleados' },
    { ruta: '/panel/estadisticas', texto: 'Estadísticas' },
  ];
}