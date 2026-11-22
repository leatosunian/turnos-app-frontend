import { AppointmentResponse } from '../../../core/models/turno';

export interface ResumenHoy {
  /** Turnos que se ofrecen hoy: libres + tomados (sin cancelados ni suspendidos). */
  ofrecidos: number;
  libres: number;
  /** Reservados o esperando seña. */
  tomados: number;
  /** Tomados sobre ofrecidos, redondeado. null si hoy no hay turnos. */
  ocupacion: number | null;
  /** Tomados que tienen seña. */
  conSena: number;
  senasPagadas: number;
}

const TOMADOS = new Set(['BOOKED', 'AWAITING_PAYMENT']);

/**
 * La ocupación se calcula acá y no con el occupancyRate del back, porque ese no cuenta los libres.
 */
export function resumirHoy(turnos: AppointmentResponse[]): ResumenHoy {
  const tomados = turnos.filter((t) => TOMADOS.has(t.status));
  const libres = turnos.filter((t) => t.status === 'UNBOOKED').length;
  const ofrecidos = tomados.length + libres;
  const conSena = tomados.filter((t) => t.deposit);
  return {
    ofrecidos,
    libres,
    tomados: tomados.length,
    ocupacion: ofrecidos ? Math.round((tomados.length / ofrecidos) * 100) : null,
    conSena: conSena.length,
    senasPagadas: conSena.filter((t) => t.deposit!.status === 'PAID').length,
  };
}

function ms(fecha: string): number {
  return new Date(fecha).getTime();
}

/** El turno reservado que está pasando ahora, si hay. */
export function turnoEnCurso(
  turnos: AppointmentResponse[],
  ahora: Date,
): AppointmentResponse | null {
  const t = ahora.getTime();
  return (
    turnos.find(
      (x) => x.status === 'BOOKED' && ms(x.startDatetime) <= t && t < ms(x.endDatetime),
    ) ?? null
  );
}

/** Minutos que le quedan a un turno (redondeado para arriba, mínimo 0). */
export function minutosRestantes(turno: AppointmentResponse, ahora: Date): number {
  return Math.max(0, Math.ceil((ms(turno.endDatetime) - ahora.getTime()) / 60_000));
}

export function duracionMinutos(turno: AppointmentResponse): number {
  return Math.round((ms(turno.endDatetime) - ms(turno.startDatetime)) / 60_000);
}

/**
 * El que se muestra en el detalle al entrar: el que está en curso, si no el próximo con
 * cliente, si no el primero con cliente. Los libres no tienen detalle.
 */
export function turnoInicial(
  turnos: AppointmentResponse[],
  ahora: Date,
): AppointmentResponse | null {
  const conCliente = turnos.filter((t) => t.status !== 'UNBOOKED');
  return (
    turnoEnCurso(turnos, ahora) ??
    conCliente.find((t) => ms(t.startDatetime) > ahora.getTime()) ??
    conCliente[0] ??
    null
  );
}

/** Porcentaje de seña sobre el precio (el turno no trae el % del servicio). */
export function porcentajeSena(turno: AppointmentResponse): number | null {
  if (!turno.deposit || !turno.price) return null;
  return Math.round((Number(turno.deposit.amount) / Number(turno.price)) * 100);
}
