import { Component, computed, input } from '@angular/core';
import { AppointmentResponse } from '../../../core/models/turno';

export type Estado =
  'libre' | 'esperando' | 'confirmado' | 'en-curso' | 'terminado' | 'cancelado' | 'suspendido';

const ESTADOS: Record<Estado, { texto: string; chip: string; punto: string }> = {
  libre: {
    texto: 'Libre',
    chip: 'border border-dashed border-line-strong text-fg-2',
    punto: 'border border-dashed border-muted',
  },
  esperando: { texto: 'Esperando seña', chip: 'bg-danger-soft text-danger-fg', punto: 'bg-danger' },
  confirmado: { texto: 'Confirmado', chip: 'bg-success-soft text-success', punto: 'bg-success' },
  'en-curso': { texto: 'En curso', chip: 'bg-accent-soft text-accent', punto: 'bg-accent' },
  terminado: { texto: 'Terminado', chip: 'bg-surface-2 text-muted', punto: 'border border-muted' },
  cancelado: { texto: 'Cancelado', chip: 'bg-surface-2 text-muted line-through', punto: 'bg-idle' },
  suspendido: { texto: 'Suspendido', chip: 'bg-info-soft text-info', punto: 'bg-info' },
};

// El estado que se le muestra al dueño. Sale del status del back, salvo en los BOOKED, que se
// parten en confirmado, en curso y terminado comparando con la hora actual, porque el back no
// tiene esos estados. Lo usa este chip y tambien las tarjetas de la Agenda, para pintarlas con
// el mismo criterio. Por ejemplo un BOOKED de 10:00 a 10:30 a las 10:10 da en curso
export function estadoDeTurno(
  turno: Pick<AppointmentResponse, 'status' | 'startDatetime' | 'endDatetime'>,
  ahora: Date = new Date(),
): Estado {
  switch (turno.status) {
    case 'UNBOOKED':
      return 'libre';
    case 'AWAITING_PAYMENT':
      return 'esperando';
    case 'CANCELLED':
      return 'cancelado';
    case 'SUSPENDED':
      return 'suspendido';
    case 'BOOKED': {
      const momento = ahora.getTime();
      if (momento >= new Date(turno.endDatetime).getTime()) return 'terminado';
      if (momento >= new Date(turno.startDatetime).getTime()) return 'en-curso';
      return 'confirmado';
    }
  }
}

@Component({
  selector: 'app-estado-turno',
  template: `
    <span class="size-2 shrink-0 rounded-full {{ estilo().punto }}" aria-hidden="true"></span>
    {{ estilo().texto }}
  `,
  host: {
    '[class]': `'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-small whitespace-nowrap ' + estilo().chip`,
  },
})
export class EstadoTurno {
  readonly turno =
    input.required<Pick<AppointmentResponse, 'status' | 'startDatetime' | 'endDatetime'>>();
  // se puede pasar para los tests; si no, se toma la hora del momento
  readonly ahora = input<Date>();

  private readonly estado = computed<Estado>(() =>
    estadoDeTurno(this.turno(), this.ahora() ?? new Date()),
  );

  protected readonly estilo = computed(() => ESTADOS[this.estado()]);
}
