import { AppointmentResponse } from './turno';

/**
 * Lo que la página del negocio (TA-11) le pasa a /reserva/:id al navegar, porque el back no
 * tiene un endpoint público para traer un turno por id. Va como state de la navegación:
 *
 *   router.navigate(['/reserva', turno.id], { state: reserva });
 *
 * El navegador lo guarda en history.state, así que sobrevive a una recarga, pero no a abrir
 * el link en otro dispositivo.
 */
export interface ReservaEnCurso {
  /** Lo que devolvió POST /appointments/{id}/book. */
  turno: AppointmentResponse;
  negocio: { name: string; slug: string };
  /** Cuándo se reservó (ISO). El back libera el turno a los 30 min si no se paga la seña. */
  reservadaEn: string;
}

/** Minutos que el back guarda un turno reservado sin pagar (AppointmentExpirationJob). */
export const MINUTOS_PARA_PAGAR = 30;

/** Saca la reserva del state de la navegación, si es la de ese turno. */
export function leerReserva(state: unknown, turnoId: string): ReservaEnCurso | null {
  const reserva = state as Partial<ReservaEnCurso> | null | undefined;
  return reserva?.turno?.id === turnoId && reserva.negocio && reserva.reservadaEn
    ? { turno: reserva.turno, negocio: reserva.negocio, reservadaEn: reserva.reservadaEn }
    : null;
}
