import { Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

type Icono = 'hoy' | 'agenda' | 'metricas' | 'usuarios' | 'negocios' | 'rubros';

const LINKS_PANEL: { ruta: string; texto: string; icono: Icono }[] = [
  { ruta: '/panel', texto: 'Hoy', icono: 'hoy' },
  { ruta: '/panel/agenda', texto: 'Agenda', icono: 'agenda' },
  { ruta: '/panel/estadisticas', texto: 'Métricas', icono: 'metricas' },
];

// El empleado que no es dueño tiene solo estas dos pantallas, asi que no lleva el boton Mas
const LINKS_EMPLEADO: { ruta: string; texto: string; icono: Icono }[] = [
  { ruta: '/panel/mis-turnos', texto: 'Mis turnos', icono: 'agenda' },
  { ruta: '/panel/actividad', texto: 'Mi actividad', icono: 'metricas' },
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
  // empleado que no es dueño: le cambia los links y le saca el Mas
  readonly empleado = input(false);
  readonly masAbierto = input(false);

  /** Toca "Más": abre o cierra el menú. */
  readonly alternarMas = output<void>();
  /** Toca cualquier link de la barra: el menú se cierra aunque ya esté en esa ruta. */
  readonly navegar = output<void>();

  protected readonly links = computed(() =>
    this.admin() ? LINKS_ADMIN : this.empleado() ? LINKS_EMPLEADO : LINKS_PANEL,
  );

  // El Mas lleva a pantallas del dueño, asi que solo va en el panel del dueño
  protected readonly conMas = computed(() => !this.admin() && !this.empleado());

  // Cuantas columnas tiene la barra: una por link mas la del Mas si va. Hoy siempre da 4 salvo
  // para el empleado, que da 2. Se usa una clase fija por caso porque Tailwind no ve clases
  // armadas con texto, como grid-cols- seguido de un numero calculado
  protected readonly columnas = computed(() =>
    this.links().length + (this.conMas() ? 1 : 0) === 2 ? 'grid-cols-2' : 'grid-cols-4',
  );
}
