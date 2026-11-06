import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { BarraInferior } from './barra-inferior/barra-inferior';
import { MenuMas } from './menu-mas/menu-mas';

@Component({
  imports: [RouterOutlet, Sidebar, BarraInferior, MenuMas],
  selector: 'app-private-layout',
  styleUrl: './private-layout.css',
  templateUrl: './private-layout.html',
  host: { '(document:keydown.escape)': 'cerrarMas()' },
})
export class PrivateLayout {
  // /admin usa este mismo layout con data: { admin: true }
  protected readonly admin = inject(ActivatedRoute).snapshot.data['admin'] === true;

  /** Menú "Más" del celular. Tapa el contenido pero no es una ruta, así la página no se pierde. */
  protected readonly masAbierto = signal(false);

  protected alternarMas(): void {
    this.masAbierto.update((abierto) => !abierto);
  }

  protected cerrarMas(): void {
    this.masAbierto.set(false);
  }
}
