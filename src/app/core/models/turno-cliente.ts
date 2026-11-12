import { AppointmentResponse } from './turno';

/** Horas antes del turno hasta las que cancelar devuelve la seña (regla del back). */
export const HORAS_PARA_DEVOLVER_SENA = 24;

const HORA = 60 * 60 * 1000;

type TurnoConHorario = Pick<AppointmentResponse, 'status' | 'startDatetime' | 'endDatetime'>;

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

/** Hasta cuándo se puede cancelar con devolución de la seña. */
export function limiteDevolucion(turno: Pick<AppointmentResponse, 'startDatetime'>): Date {
  return new Date(new Date(turno.startDatetime).getTime() - HORAS_PARA_DEVOLVER_SENA * HORA);
}

/** Igual que el back: con 24 h o más de anticipación la seña vuelve. */
export function seDevuelveLaSena(
  turno: Pick<AppointmentResponse, 'startDatetime'>,
  ahora: Date = new Date(),
): boolean {
  return ahora.getTime() <= limiteDevolucion(turno).getTime();
}
