import { Component, input, model } from '@angular/core';

export interface OpcionSegmentado {
  valor: string;
  texto: string;
}

@Component({
  selector: 'app-segmentado',
  template: `
    @for (opcion of opciones(); track opcion.valor) {
      <button
        type="button"
        [attr.aria-pressed]="opcion.valor === valor()"
        (click)="valor.set(opcion.valor)"
        class="h-8 rounded-md px-3 font-medium"
        [class]="opcion.valor === valor() ? 'bg-line text-fg' : 'text-muted hover:text-fg'"
      >
        {{ opcion.texto }}
      </button>
    }
  `,
  host: {
    role: 'group',
    '[attr.aria-label]': 'etiqueta()',
    class: 'inline-flex w-fit gap-0.5 rounded-control border border-line bg-app p-[3px]',
  },
})
export class Segmentado {
  readonly opciones = input.required<OpcionSegmentado[]>();
  readonly valor = model.required<string>();
  readonly etiqueta = input.required<string>();
}
