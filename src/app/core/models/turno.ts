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
