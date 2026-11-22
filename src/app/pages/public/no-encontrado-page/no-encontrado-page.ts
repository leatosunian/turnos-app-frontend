import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Boton } from '../../../shared/components/boton/boton';

// Va como página (ruta '**') y como componente dentro del perfil cuando el slug no existe:
// <app-no-encontrado-page /> toma el link de la URL actual, o se le pasa con [link].
@Component({
  imports: [Boton, RouterLink],
  selector: 'app-no-encontrado-page',
  styleUrl: './no-encontrado-page.css',
  templateUrl: './no-encontrado-page.html',
})
export class NoEncontradoPage {
  private readonly router = inject(Router);

  readonly link = input<string>();

  protected readonly dominio = inject(DOCUMENT).location.host;

  protected readonly ruta = computed(() => {
    const ruta = this.link() ?? this.router.url;
    return decodeURIComponent(ruta.split(/[?#]/)[0]).replace(/^\/+/, '');
  });

  // un solo tramo es un link de negocio (/:slug); con más, es una ruta de la app que no existe
  protected readonly esNegocio = computed(() => !this.ruta().includes('/'));
}
