import { AppointmentResponse } from './turno';

/**
 * Horas antes del turno hasta las que cancelar devuelve la seña cuando no viene la política: la
 * regla fija de antes, que también es la que toman los negocios que no eligieron otra.
 */
export const HORAS_PARA_DEVOLVER_SENA = 24;

const HORA = 60 * 60 * 1000;

type TurnoConHorario = Pick<AppointmentResponse, 'status' | 'startDatetime' | 'endDatetime'>;
type TurnoConSena = Pick<AppointmentResponse, 'startDatetime' | 'deposit'>;

/** Próximos: reservados o esperando la seña que todavía no terminaron. El resto es historial. */
export function esProximo(turno: TurnoConHorario, ahora: Date = new Date()): boolean {
  return (
    (turno.status === 'BOOKED' || turno.status === 'AWAITING_PAYMENT') &&
    ahora.getTime() < new Date(turno.endDatetime).getTime()
  );
}

/** El cliente solo cancela turnos confirmados que todavía no empezaron. */
export function sePuedeCancelar(turno: TurnoConHorario, ahora: Date = new Date()): boolean {
  return turno.status === 'BOOKED' && ahora.getTime() < new Date(turno.startDatetime).getTime();
}

/** Si el turno tiene una seña de más de $0. Sin seña no hay nada que devolver ni que avisar. */
export function tieneSena(turno: Pick<AppointmentResponse, 'deposit'>): boolean {
  return Number(turno.deposit?.amount ?? 0) > 0;
}

/**
 * Las horas de la política con la que se reservó el turno. Son las que guardó la seña y no las
 * actuales del negocio, porque el dueño las puede haber cambiado después de la reserva.
 */
export function horasDePolitica(turno: Pick<AppointmentResponse, 'deposit'>): number {
  return turno.deposit?.cancellationNoticeHours ?? HORAS_PARA_DEVOLVER_SENA;
}

/** Hasta cuándo se puede cancelar con devolución de la seña. */
export function limiteDevolucion(turno: TurnoConSena): Date {
  return new Date(new Date(turno.startDatetime).getTime() - horasDePolitica(turno) * HORA);
}

/**
 * Igual que el back: con las horas de la política o más de anticipación, la seña vuelve. Por
 * ejemplo con 48 h, un turno del viernes a las 10:00 se puede cancelar con devolución hasta el
 * miércoles a las 10:00 inclusive.
 */
export function seDevuelveLaSena(turno: TurnoConSena, ahora: Date = new Date()): boolean {
  return ahora.getTime() <= limiteDevolucion(turno).getTime();
}
