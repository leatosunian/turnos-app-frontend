export type AppointmentStatus =
  'UNBOOKED' | 'AWAITING_PAYMENT' | 'BOOKED' | 'CANCELLED' | 'SUSPENDED';

// Ojo: CANCELED va con una sola L, a diferencia de AppointmentStatus.
export type DepositStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FORFEITED' | 'CANCELED';

export interface DepositResponse {
  id: string;
  amount: number;
  status: DepositStatus;
  paidAt: string | null;
}

export interface AppointmentResponse {
  id: string;
  startDatetime: string;
  endDatetime: string;
  status: AppointmentStatus;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  price: number;
  businessId: string;
  /**
   * Pedidos al back para Mis turnos (TA-27): hoy no vienen y un CLIENT no puede pedir
   * GET /businesses/{id}. Mientras falten, la pantalla muestra solo el servicio.
   */
  businessName?: string | null;
  businessSlug?: string | null;
  serviceId: string;
  serviceName: string;
  employeeId: string | null;
  employeeName: string | null;
  createdAt: string;
  deposit: DepositResponse | null;
  /**
   * Hasta cuándo se guarda la reserva sin pagar (la hora de la reserva + 30 min, hora del
   * servidor, sin zona). Solo viene en AWAITING_PAYMENT; en los demás estados es null.
   */
  expiresAt?: string | null;
}

/**
 * Datos del cliente al reservar. Si hay sesión, el back usa el nombre y el email del usuario
 * logueado y solo toma el teléfono.
 */
export interface BookAppointmentRequest {
  /** Hasta 100 caracteres. */
  clientName?: string;
  clientEmail?: string;
  /** Entre 7 y 20 caracteres: dígitos, espacios, '+' o '-'. */
  clientPhone?: string;
}

// Lo que manda la Agenda del panel para crear un turno en un dia y hora puntual, fuera de la
// plantilla semanal. El fin no se manda: el back le suma la duracion del servicio.
// Sin datos del cliente el turno queda libre y se publica; con el nombre (y si quiere el email
// y el telefono) queda reservado a nombre de esa persona y sin seña, por ejemplo alguien que
// pidio turno por telefono. Los vacios el back los toma como no enviados.
// Responde 409 si se pisa con otro del mismo profesional y 400 si la hora ya paso.
export interface CreateAppointmentRequest {
  // sin zona, como las demas fechas del back, por ejemplo 2026-11-16T10:00:00
  startDatetime: string;
  serviceId: string;
  // null es sin asignar
  employeeId?: string | null;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
}

/**
 * Solo se suspenden turnos reservados que todavía no terminaron (Confirmado o En curso).
 * El back deja suspender cualquier BOOKED, pero en uno terminado le devolvería la seña al cliente.
 */
export function sePuedeSuspender(
  turno: Pick<AppointmentResponse, 'status' | 'endDatetime'>,
  ahora: Date = new Date(),
): boolean {
  return turno.status === 'BOOKED' && ahora.getTime() < new Date(turno.endDatetime).getTime();
}
