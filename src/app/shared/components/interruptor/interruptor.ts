import { booleanAttribute, Component, computed, input, model } from '@angular/core';

// "cielo" es el de las pantallas de administración
export type TonoInterruptor = 'ambar' | 'cielo';

const ENCENDIDO: Record<TonoInterruptor, { fondo: string; perilla: string }> = {
  ambar: { fondo: 'bg-accent', perilla: 'bg-on-accent' },
  cielo: { fondo: 'bg-info', perilla: 'bg-app' },
};

@Component({
  selector: 'app-interruptor',
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="encendido()"
      [attr.aria-label]="etiqueta()"
      [disabled]="disabled()"
      (click)="encendido.set(!encendido())"
      class="flex h-6 w-10 items-center rounded-full p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      [class]="encendido() ? colores().fondo : 'bg-line-strong'"
    >
      <span
        class="size-5 rounded-full transition-transform duration-200 ease-out"
        [class]="encendido() ? 'translate-x-4 ' + colores().perilla : 'bg-fg-2'"
      ></span>
    </button>
  `,
  host: { class: 'inline-flex' },
})
export class Interruptor {
  readonly encendido = model(false);
  readonly etiqueta = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly tono = input<TonoInterruptor>('ambar');

  protected readonly colores = computed(() => ENCENDIDO[this.tono()]);
}
