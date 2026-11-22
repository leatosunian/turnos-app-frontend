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
  /** Horas de anticipación con las que cancelar devuelve la seña: 24, 48, 72 o 96. */
  cancellationNoticeHours?: number | null;
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
}
