import { Component, computed, input } from '@angular/core';

export type TonoPastilla = 'neutra' | 'ambar' | 'cielo';

const TONOS: Record<TonoPastilla, string> = {
  neutra: 'bg-surface-3 text-fg-2',
  ambar: 'bg-accent-soft text-accent',
  cielo: 'bg-info-soft text-info',
};

// "cielo" es la de Futuro y la de Admin
@Component({
  selector: 'app-pastilla',
  template: '<ng-content />',
  host: { '[class]': 'clases()' },
})
export class Pastilla {
  readonly tono = input<TonoPastilla>('neutra');

  protected readonly clases = computed(
    () => `inline-flex w-fit rounded-full px-2.5 py-0.5 text-label ${TONOS[this.tono()]}`,
  );
}
