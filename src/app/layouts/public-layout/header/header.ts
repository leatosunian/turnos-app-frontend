import { ViewportScroller } from '@angular/common';
import { Component, ElementRef, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';
import { accesosDeSesion } from '../accesos';

@Component({
  imports: [RouterLink, RouterLinkActive, Pastilla],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
  host: {
    // queda pegado arriba al scrollear y por encima del contenido de la pagina
    class: 'sticky top-0 z-40 block',
    // con Escape se cierra el menu del celular, como cualquier desplegable
    '(document:keydown.escape)': 'cerrarMenu()',
  },
})
export class Header {
  constructor() {
    // Cuando un link lleva a una seccion (por ejemplo /#rubros), Angular baja hasta que la
    // seccion toca el borde de arriba de la pantalla. Como el header queda pegado arriba, la
    // taparia. Con este offset baja un poco menos: lo que mide el header, que son 61 px en el
    // celular y 73 en desktop. Es una funcion y no un numero fijo para que tome el alto real
    // en cada momento, aunque se cambie el tamaño de la ventana.
    const elemento: HTMLElement = inject(ElementRef).nativeElement;
    inject(ViewportScroller).setOffset(() => [0, elemento.offsetHeight]);
  }

  // Si el menu desplegable del celular esta abierto. En desktop no se usa porque los links
  // estan siempre a la vista.
  protected readonly menuAbierto = signal(false);

  // a donde van Ingresar y Mis turnos segun la sesion, ver accesos.ts
  protected readonly accesos = accesosDeSesion();

  // Links a las secciones de la landing. Van con routerLink a la raiz mas el fragment, asi
  // funcionan tambien desde otra pagina: en /ingresar, Rubros lleva a /#rubros y baja hasta
  // la seccion (eso lo hace el anchorScrolling que esta prendido en app.config).
  protected readonly secciones = [
    { texto: 'Cómo funciona', ancla: 'como' },
    { texto: 'Funciones', ancla: 'funciones' },
    { texto: 'Rubros', ancla: 'rubros' },
  ];

  protected alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  // Lo llaman todos los links del menu al tocarlos. No alcanza con escuchar la navegacion
  // del router porque si tocas la misma ancla dos veces la URL no cambia y no hay navegacion,
  // asi que el menu se quedaria abierto tapando la pagina.
  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
