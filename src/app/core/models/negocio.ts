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
  deleted: boolean;
  ownerId: string;
  businessTypes: BusinessTypeResponse[];
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
