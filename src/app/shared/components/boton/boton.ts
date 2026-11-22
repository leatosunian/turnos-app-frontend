import { booleanAttribute, Component, computed, input } from '@angular/core';

export type VarianteBoton = 'primario' | 'secundario' | 'destructivo';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control px-4 whitespace-nowrap disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-3 disabled:text-muted';

const VARIANTES: Record<VarianteBoton, string> = {
  primario: 'bg-accent font-semibold text-on-accent not-disabled:hover:bg-accent-hover',
  secundario:
    'border border-line-strong bg-surface-2 font-medium text-fg not-disabled:hover:bg-surface-3',
  destructivo:
    'border border-danger-line font-medium text-danger-fg not-disabled:hover:bg-danger-soft',
};

@Component({
  selector: 'button[appBoton], a[appBoton]',
  template: '<ng-content />',
  host: { '[class]': 'clases()' },
})
export class Boton {
  readonly variante = input<VarianteBoton>('primario');
  // las pantallas públicas usan 48 px porque se tocan desde el celular
  readonly grande = input(false, { transform: booleanAttribute });

  protected readonly clases = computed(
    () => `${BASE} ${VARIANTES[this.variante()]} ${this.grande() ? 'h-12' : 'h-10'}`,
  );
}
