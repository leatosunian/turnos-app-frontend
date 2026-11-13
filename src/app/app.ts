import { Component, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter, take } from 'rxjs';
import { CargadorService } from './core/services/cargador-service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('turnos-app-frontend');

  constructor() {
    const cargador = inject(CargadorService);

    // El loader se va cuando termina la primera navegacion, que es cuando la pagina pedida ya
    // esta armada. Contamos tambien la cancelada y la fallida (por ejemplo un guard que manda a
    // /ingresar), si no el loader se quedaria tapando todo para siempre. take(1) porque solo
    // importa la primera: las navegaciones de despues no muestran loader.
    inject(Router)
      .events.pipe(
        filter(
          (evento) =>
            evento instanceof NavigationEnd ||
            evento instanceof NavigationCancel ||
            evento instanceof NavigationError,
        ),
        take(1),
      )
      .subscribe(() => cargador.ocultar());
  }
}
