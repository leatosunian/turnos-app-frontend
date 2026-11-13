import { AppointmentResponse } from './turno';

/**
 * Lo que la página del negocio (TA-11) le pasa a /reserva/:id al navegar, como state:
 *
 *   router.navigate(['/reserva', turno.id], { state: reserva });
 *
 * La página de pago ya no lo usa para mostrar datos: siempre le pide el turno al back
 * (GET /appointments/{id}), que es lo único confiable. Solo lo usa para saber si la reserva
 * sigue siendo la que hizo esta persona (ver senaDeLaReserva).
 */
export interface ReservaEnCurso {
  /** Lo que devolvió POST /appointments/{id}/book. */
  turno: AppointmentResponse;
  negocio: { name: string; slug: string };
  /** Cuándo se reservó (ISO), con la hora de la PC. */
  reservadaEn: string;
}

/**
 * El id de la seña que se creó al reservar, si el state de la navegación es de este turno.
 *
 * El id de /reserva/:id es el del horario, no el de la reserva: si la reserva vence, el horario
 * vuelve a estar libre y otra persona lo puede tomar con el mismo id. Cada reserva crea su propia
 * seña, así que comparando este id con el de la seña que devuelve el back se sabe si el turno
 * sigue siendo de quien reservó. Sin state (link abierto en otro dispositivo) devuelve null y no
 * se puede comparar.
 */
export function senaDeLaReserva(state: unknown, turnoId: string): string | null {
  const reserva = state as Partial<ReservaEnCurso> | null | undefined;
  if (reserva?.turno?.id !== turnoId) return null;
  return typeof reserva.turno.deposit?.id === 'string' ? reserva.turno.deposit.id : null;
}
