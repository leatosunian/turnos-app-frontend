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
