import { AfterViewInit, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { Boton } from '../boton/boton';

let siguienteId = 0;

/**
 * Diálogo para confirmar una acción destructiva (suspender, eliminar). Se muestra con un @if
 * desde la pantalla; el detalle va proyectado. Escape o "Volver" cancelan, salvo mientras procesa.
 */
@Component({
  selector: 'app-confirmacion',
  imports: [Boton],
  template: `
    <div class="fixed inset-0 z-30 flex items-end justify-center bg-app/70 p-2.5 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        [attr.aria-labelledby]="id + '-titulo'"
        [attr.aria-describedby]="id + '-detalle'"
        class="flex w-full max-w-sm flex-col gap-4 rounded-container border border-line-strong bg-surface-1 p-5"
      >
        <div class="flex flex-col gap-1.5">
          <h2 [id]="id + '-titulo'" class="text-h2">{{ titulo() }}</h2>
          <div [id]="id + '-detalle'" class="text-fg-2"><ng-content /></div>
        </div>
        @if (error()) {
          <p role="alert" class="text-small text-danger-fg">{{ error() }}</p>
        }
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            #volver
            appBoton
            variante="secundario"
            type="button"
            (click)="cancelar()"
            [disabled]="procesando()"
          >
            Volver
          </button>
          <button
            appBoton
            variante="destructivo"
            type="button"
            (click)="confirmado.emit()"
            [disabled]="procesando()"
          >
            {{ procesando() ? textoProcesando() : textoConfirmar() }}
          </button>
        </div>
      </div>
    </div>
  `,
  host: { '(document:keydown.escape)': 'cancelar()' },
})
export class Confirmacion implements AfterViewInit {
  readonly titulo = input.required<string>();
  readonly textoConfirmar = input.required<string>();
  /** Lo que dice el botón mientras espera al back ("Suspendiendo…"). */
  readonly textoProcesando = input.required<string>();
  readonly procesando = input(false);
  /** Mensaje del back si la acción falló. El diálogo queda abierto para reintentar. */
  readonly error = input('');

  readonly confirmado = output<void>();
  readonly cancelado = output<void>();

  protected readonly id = `confirmacion-${siguienteId++}`;
  // read: ElementRef porque el botón es el componente appBoton
  private readonly volver = viewChild.required('volver', { read: ElementRef<HTMLButtonElement> });

  ngAfterViewInit(): void {
    // El foco arranca en "Volver" para que un Enter apurado no confirme algo destructivo.
    this.volver().nativeElement.focus();
  }

  protected cancelar(): void {
    if (!this.procesando()) this.cancelado.emit();
  }
}
