import { Injectable, signal } from '@angular/core';

/**
 * Si el menú "Más" del celular está abierto. Lo maneja el layout privado, pero las pantallas
 * que se abren desde "Más" (Turnos, Servicios, Horarios, Mi negocio) lo usan para su link "‹ Más".
 */
@Injectable({ providedIn: 'root' })
export class MenuMasEstado {
  private readonly estado = signal(false);

  readonly abierto = this.estado.asReadonly();

  abrir(): void {
    this.estado.set(true);
  }

  cerrar(): void {
    this.estado.set(false);
  }

  alternar(): void {
    this.estado.update((abierto) => !abierto);
  }
}
