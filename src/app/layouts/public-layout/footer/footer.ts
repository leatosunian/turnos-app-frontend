import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { accesosDeSesion } from '../accesos';

interface ColumnaFooter {
  titulo: string;
  links: { texto: string; ruta: string; ancla?: string; externo?: boolean }[];
}

@Component({
  imports: [RouterLink],
  selector: 'app-footer',
  styleUrl: './footer.css',
  templateUrl: './footer.html',
})
export class Footer {
  protected readonly anio = new Date().getFullYear();

  private readonly accesos = accesosDeSesion();

  // Las anclas apuntan a las secciones de la landing (TA-14). Es computed porque la columna
  // Clientes cambia con la sesion: Ingresar lleva a la pantalla del rol si ya hay sesion, y
  // Mis turnos solo aparece sin sesion o para clientes (ver accesos.ts).
  protected readonly columnas = computed<ColumnaFooter[]>(() => [
    {
      titulo: 'Producto',
      links: [
        { texto: 'Cómo funciona', ruta: '/', ancla: 'como' },
        { texto: 'Funciones', ruta: '/', ancla: 'funciones' },
        { texto: 'Rubros', ruta: '/', ancla: 'rubros' },
      ],
    },
    {
      titulo: 'Clientes',
      links: [
        ...(this.accesos.veMisTurnos() ? [{ texto: 'Mis turnos', ruta: '/mis-turnos' }] : []),
        { texto: 'Ingresar', ruta: this.accesos.rutaIngresar() },
      ],
    },
    {
      titulo: 'Proyecto',
      links: [
        {
          texto: 'Repositorio',
          ruta: 'https://github.com/leatosunian/turnos-app-frontend',
          externo: true,
        },
      ],
    },
  ]);
}
