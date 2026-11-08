import { booleanAttribute, Component, computed, input } from '@angular/core';

// ocupado = disabled
@Component({
  selector: 'button[appSlot]',
  template: '<ng-content />',
  host: {
    '[class]': 'clases()',
    '[attr.aria-pressed]': 'seleccionado()',
  },
})
export class Slot {
  readonly seleccionado = input(false, { transform: booleanAttribute });
  readonly grande = input(false, { transform: booleanAttribute });

  protected readonly clases = computed(() => {
    const alto = this.grande() ? 'h-12' : 'h-10';
    const estado = this.seleccionado()
      ? 'border-accent bg-accent text-on-accent'
      : 'border-line-strong text-fg not-disabled:hover:bg-surface-3';

    return `inline-flex items-center justify-center rounded-full border px-4 font-mono tabular-nums disabled:cursor-not-allowed disabled:text-faint disabled:line-through ${alto} ${estado}`;
  });
}
