import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { BarraInferior } from './barra-inferior/barra-inferior';
import { MenuMas } from './menu-mas/menu-mas';
import { MenuMasEstado } from './menu-mas/menu-mas-estado';

@Component({
  imports: [RouterOutlet, Sidebar, BarraInferior, MenuMas],
  selector: 'app-private-layout',
  styleUrl: './private-layout.css',
  templateUrl: './private-layout.html',
  host: { '(document:keydown.escape)': 'cerrarMas()' },
})
export class PrivateLayout {
  private readonly menuMas = inject(MenuMasEstado);

  // /admin usa este mismo layout con data: { admin: true }
  protected readonly admin = inject(ActivatedRoute).snapshot.data['admin'] === true;

  /** Menú "Más" del celular. Tapa el contenido pero no es una ruta, así la página no se pierde. */
  protected readonly masAbierto = this.menuMas.abierto;

  protected alternarMas(): void {
    this.menuMas.alternar();
  }

  protected cerrarMas(): void {
    this.menuMas.cerrar();
  }
}
