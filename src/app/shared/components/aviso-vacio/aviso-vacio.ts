import { Component, input } from '@angular/core';

// la acción ("Crear el primero") va proyectada, así puede ser un link o un botón
@Component({
  selector: 'app-aviso-vacio',
  template: `
    <p class="font-semibold text-fg">{{ titulo() }}</p>
    @if (detalle()) {
      <p class="max-w-90 text-small text-muted">{{ detalle() }}</p>
    }
    <div class="mt-2 flex flex-wrap justify-center gap-2 empty:hidden">
      <ng-content />
    </div>
  `,
  host: {
    class:
      'flex flex-col items-center gap-1 rounded-card border border-dashed border-line-strong bg-surface-2 px-6 py-10 text-center',
  },
})
export class AvisoVacio {
  readonly titulo = input.required<string>();
  readonly detalle = input<string>();
}
