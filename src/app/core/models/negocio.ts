export interface BusinessTypeResponse {
  id: string;
  name: string;
  deleted: boolean;
}

export interface BusinessResponse {
  id: string;
  name: string;
  email: string;
  slug: string;
  phone: string;
  description: string | null;
  automaticSchedule: boolean;
  scheduleEnd: string | null;
  scheduleDaysToCreate: number;
  scheduleAnticipation: number;
  // horas antes del turno hasta las que se devuelve la seña si el cliente cancela (24, 48, 72 o 96).
  // Puede faltar o venir null en un back viejo, y ahi vale 24, que es la regla de siempre
  cancellationNoticeHours?: number | null;
  // horas minimas entre la reserva y el comienzo del turno (0, 1, 2, 4, 12 o 24). Si falta o
  // viene null vale 0, o sea sin minimo. Va opcional porque el back lo suma recien con TA-35
  minBookingNoticeHours?: number | null;
  deleted: boolean;
  ownerId: string;
  businessTypes: BusinessTypeResponse[];
  /**
   * Con cuántas horas de anticipación como mínimo se puede reservar: 0, 1, 2, 4, 12 o 24. Si no
   * viene (negocios de antes de la regla), es 0: se puede reservar hasta que empiece el turno.
   */
  minBookingNoticeHours?: number | null;
}

export interface BusinessRequest {
  name: string;
  email: string;
  slug: string;
  /** Entre 7 y 15 dígitos, sin espacios ni '+'. */
  phone: string;
  description?: string;
  automaticSchedule?: boolean;
  scheduleEnd?: string | null;
  scheduleDaysToCreate?: number;
  scheduleAnticipation?: number;
  // si no se mandan, el back deja los valores que ya tenia el negocio. Por eso Horarios, que
  // tambien hace el PUT, no los manda y no pisa lo que se eligio en Mi negocio
  cancellationNoticeHours?: number;
  minBookingNoticeHours?: number;
}
