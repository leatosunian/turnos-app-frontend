import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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

  // las anclas apuntan a las secciones de la landing (TA-4)
  protected readonly columnas: ColumnaFooter[] = [
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
        { texto: 'Mis turnos', ruta: '/mis-turnos' },
        { texto: 'Ingresar', ruta: '/ingresar' },
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
  ];
}
