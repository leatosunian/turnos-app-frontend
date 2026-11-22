import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth-service';
import { Sidebar } from './sidebar/sidebar';
import { BarraInferior } from './barra-inferior/barra-inferior';
import { MenuMas } from './menu-mas/menu-mas';
import { MenuMasEstado } from './menu-mas/menu-mas-estado';

@Component({
  imports: [RouterLink, RouterOutlet, Sidebar, BarraInferior, MenuMas],
  selector: 'app-private-layout',
  styleUrl: './private-layout.css',
  templateUrl: './private-layout.html',
  host: { '(document:keydown.escape)': 'cerrarMas()' },
})
export class PrivateLayout {
  private readonly menuMas = inject(MenuMasEstado);

  // /admin usa este mismo layout con data: { admin: true }
  protected readonly admin = inject(ActivatedRoute).snapshot.data['admin'] === true;

  private readonly auth = inject(AuthService);

  // Empleado que no es dueño: en el panel solo tiene Mis turnos y Mi actividad. En el celular
  // la barra de abajo le muestra esas dos y no lleva el Mas, y tampoco va el boton flotante de
  // nuevo turno, porque crear turnos es cosa del dueño. Para cerrar sesion Mi actividad ya trae
  // su propio boton abajo de todo
  protected readonly soloEmpleado = computed(() => !this.admin && !this.auth.tieneRol(['OWNER']));

  /** Menú "Más" del celular. Tapa el contenido pero no es una ruta, así la página no se pierde. */
  protected readonly masAbierto = this.menuMas.abierto;

  protected alternarMas(): void {
    this.menuMas.alternar();
  }

  protected cerrarMas(): void {
    this.menuMas.cerrar();
  }
}
