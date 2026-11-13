import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { RubroService } from '../../../core/services/rubro-service';
import { Boton } from '../../../shared/components/boton/boton';
import { Aparecer } from '../../../shared/directives/aparecer';
import { accesosDeSesion } from '../../../layouts/public-layout/accesos';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';
import { nombreRubro } from '../negocio-page/reserva';

// Como se pinta cada fila de la tarjeta de ejemplo de la portada. Son los mismos colores
// que usa el panel Hoy: gris el que ya paso, ambar el que se esta atendiendo, menta el que
// pago la seña y coral el que todavia no la pago.
type EstadoEjemplo = 'terminado' | 'ahora' | 'pagada' | 'esperando';

interface TurnoEjemplo {
  hora: string;
  cliente: string;
  servicio: string;
  estado: EstadoEjemplo;
  etiqueta: string;
}

// Cada celda de la grillita de la tarjeta de agenda automatica. Es solo un dibujo:
// libre es un turno vacio, reservado uno tomado, ahora el que esta en curso y cerrado
// es un dia que el negocio no abre (va con borde punteado, como en Horarios).
type CeldaAgenda = 'libre' | 'reservado' | 'ahora' | 'cerrado';

// Slug del negocio que abre el boton "Ver un perfil de ejemplo". Ese negocio tiene que
// existir en la base, si no el boton lleva a la pagina de no encontrado. Si se cambia
// el negocio de muestra, alcanza con tocar este texto.
export const PERFIL_DE_EJEMPLO = 'estudio-malbec';

@Component({
  imports: [RouterLink, Boton, Pastilla, Aparecer],
  selector: 'app-home-page',
  styleUrl: './home-page.css',
  templateUrl: './home-page.html',
})
export class HomePage {
  private readonly rubroService = inject(RubroService);

  protected readonly perfilDeEjemplo = PERFIL_DE_EJEMPLO;

  // si se muestra el link de Mis turnos del cierre segun la sesion, ver accesos.ts
  protected readonly accesos = accesosDeSesion();

  // Rubros que se muestran como chips en la seccion Rubros. Salen de GET /business-types,
  // que es publico, asi que si el admin agrega uno nuevo aparece solo. Si el back no
  // responde devolvemos la lista vacia y la seccion queda con el titulo nomas, en vez de
  // romper la pagina entera.
  private readonly rubrosDelBack = toSignal(
    this.rubroService.listar().pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  // Los pasamos a nombre lindo (PELUQUERIA queda Peluquería) y los ordenamos alfabeticamente,
  // porque el back los devuelve en el orden en que se cargaron.
  protected readonly rubros = computed(() =>
    this.rubrosDelBack()
      .filter((rubro) => !rubro.deleted)
      .map(nombreRubro)
      .sort((a, b) => a.localeCompare(b, 'es')),
  );

  // Numero de cada rubro en el indice de la seccion Rubros, siempre con dos cifras. El indice
  // del for arranca en 0, por eso el + 1: el primero queda 01 y el decimotercero 13.
  protected numeroDeRubro(indice: number): string {
    return String(indice + 1).padStart(2, '0');
  }

  // Los tres pasos de la seccion Como funciona. El primero va con la raya de arriba en ambar.
  protected readonly pasos = [
    {
      numero: '01',
      titulo: 'Configurás tu agenda',
      texto:
        'Cargás tus servicios, los días de atención y los horarios de cada profesional. Con la agenda automática activada, los turnos se generan solos con un mes de anticipación.',
    },
    {
      numero: '02',
      titulo: 'Compartís tu link',
      texto:
        'Lo publicás en Instagram o lo enviás por WhatsApp. Tus clientes reservan sin necesidad de crear una cuenta.',
    },
    {
      numero: '03',
      titulo: 'La seña confirma el turno',
      texto:
        'El turno queda confirmado cuando el cliente paga la seña. Si cancela con 24 horas o más de anticipación, se le devuelve. Si cancela con menos tiempo, la seña queda para tu negocio.',
    },
  ];

  // Filas de la tarjeta "Hoy" de la portada. Son datos inventados, no salen del back,
  // la idea es mostrar como se ve el panel de un negocio en un dia normal.
  protected readonly turnosDeEjemplo: TurnoEjemplo[] = [
    {
      hora: '09:30',
      cliente: 'Martina F.',
      servicio: 'Corte + barba',
      estado: 'terminado',
      etiqueta: 'Terminado',
    },
    {
      hora: '10:15',
      cliente: 'Julián O.',
      servicio: 'Corte clásico',
      estado: 'ahora',
      etiqueta: 'Ahora',
    },
    {
      hora: '11:00',
      cliente: 'Camila R.',
      servicio: 'Color global',
      estado: 'pagada',
      etiqueta: 'Seña pagada',
    },
    {
      hora: '12:30',
      cliente: 'Federico P.',
      servicio: 'Corte + barba',
      estado: 'esperando',
      etiqueta: 'Esperando seña',
    },
  ];

  // Tres semanas de seis dias, una fila por semana. La ultima columna es el sabado
  // cerrado, por eso en las tres filas termina en cerrado.
  protected readonly celdasAgenda: CeldaAgenda[] = [
    ...(['libre', 'ahora', 'libre', 'libre', 'reservado', 'cerrado'] as const),
    ...(['reservado', 'libre', 'libre', 'reservado', 'libre', 'cerrado'] as const),
    ...(['libre', 'libre', 'reservado', 'libre', 'libre', 'cerrado'] as const),
  ];

  // Las mismas tres semanas dos veces seguidas, para la animacion de la grilla. La animacion
  // sube la grilla de a una semana y, cuando ya subio tres, vuelve al principio de golpe. Como
  // en ese momento se esta viendo la segunda copia, que es igual a la primera, el salto no se
  // nota y parece que las semanas suben sin fin. El track de cada celda usa el indice porque
  // los valores se repiten.
  protected readonly celdasAnimadas: CeldaAgenda[] = [...this.celdasAgenda, ...this.celdasAgenda];

  // Clases de cada fila de la tarjeta segun el estado. Devuelve el color del texto de la hora,
  // el del punto y el de la etiqueta de la derecha. Por ejemplo, para pagada da todo en menta.
  protected clasesDeTurno(estado: EstadoEjemplo) {
    switch (estado) {
      case 'terminado':
        return { fila: 'text-faint', hora: '', punto: 'border-2 border-idle', etiqueta: '' };
      case 'ahora':
        return {
          fila: 'bg-surface-3 border border-accent-line font-semibold',
          hora: 'text-accent',
          punto: 'bg-accent',
          etiqueta: 'text-accent font-normal',
        };
      case 'pagada':
        return { fila: '', hora: '', punto: 'bg-success', etiqueta: 'text-success' };
      case 'esperando':
        return { fila: '', hora: '', punto: 'bg-danger', etiqueta: 'text-danger-fg' };
    }
  }

  protected claseDeCelda(celda: CeldaAgenda): string {
    switch (celda) {
      case 'libre':
        return 'bg-surface-3';
      case 'reservado':
        return 'bg-accent-line';
      case 'ahora':
        return 'bg-accent celda-ahora';
      case 'cerrado':
        return 'border border-dashed border-line-strong';
    }
  }
}
