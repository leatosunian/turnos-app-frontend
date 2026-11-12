import { AfterViewInit, Component, ElementRef, inject, input, output } from '@angular/core';

let siguienteId = 0;

/**
 * Marco de los diálogos de alta y edición, con el mismo estilo que app-confirmacion: centrado en
 * escritorio y abajo en el celular. Escape cierra, salvo mientras se guarda.
 */
@Component({
  selector: 'app-dialogo',
  template: `
    <div class="fixed inset-0 z-30 flex items-end justify-center bg-app/70 p-2.5 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="id"
        class="flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto rounded-container border border-line-strong bg-surface-1 p-5"
      >
        <h2 [id]="id" class="text-h2">{{ titulo() }}</h2>
        <ng-content />
      </div>
    </div>
  `,
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class Dialogo implements AfterViewInit {
  readonly titulo = input.required<string>();
  /** Mientras se guarda no se puede cerrar. */
  readonly bloqueado = input(false);
  readonly cerrado = output<void>();

  protected readonly id = `dialogo-${siguienteId++}`;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  ngAfterViewInit(): void {
    this.host.nativeElement.querySelector<HTMLElement>('input')?.focus();
  }

  protected cerrar(): void {
    if (!this.bloqueado()) this.cerrado.emit();
  }
}
