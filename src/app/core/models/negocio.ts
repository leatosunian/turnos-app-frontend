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
