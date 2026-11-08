import { afterRenderEffect, Component, computed, ElementRef, inject, input } from '@angular/core';

// el input viene proyectado: no le llegan los estilos del componente, así que se estila desde el label
const BASE = [
  'flex flex-col gap-1.5 text-small text-muted',
  '[&_:is(input,select,textarea)]:w-full',
  '[&_:is(input,select,textarea)]:rounded-control',
  '[&_:is(input,select,textarea)]:border',
  '[&_:is(input,select,textarea)]:bg-app',
  '[&_:is(input,select,textarea)]:px-3',
  '[&_:is(input,select,textarea)]:text-body',
  '[&_:is(input,select,textarea)]:text-fg',
  '[&_:is(input,select,textarea)]:outline-none',
  '[&_:is(input,select,textarea)]:placeholder:text-faint',
  '[&_:is(input,select,textarea)]:disabled:text-muted',
  '[&_:is(input,select)]:h-10',
  '[&_textarea]:py-2.5',
].join(' ');

const NORMAL =
  '[&_:is(input,select,textarea)]:border-line [&_:is(input,select,textarea)]:focus:border-accent';
const CON_ERROR = '[&_:is(input,select,textarea)]:border-danger';

let siguienteId = 0;

@Component({
  selector: 'app-campo',
  templateUrl: './campo.html',
  host: { class: 'flex flex-col gap-1.5' },
})
export class Campo {
  readonly etiqueta = input.required<string>();
  readonly error = input<string | null>(null);

  protected readonly idError = `campo-error-${siguienteId++}`;
  protected readonly clases = computed(() => `${BASE} ${this.error() ? CON_ERROR : NORMAL}`);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      const control = this.host.nativeElement.querySelector('input, select, textarea');
      if (!control) return;

      if (this.error()) {
        control.setAttribute('aria-invalid', 'true');
        control.setAttribute('aria-describedby', this.idError);
      } else {
        control.removeAttribute('aria-invalid');
        control.removeAttribute('aria-describedby');
      }
    });
  }
}
