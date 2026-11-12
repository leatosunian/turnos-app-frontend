/** Período de las estadísticas. Sin período el back usa MONTH. */
export type PeriodoEstadisticas = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR';

/** Rango de fechas propio, en formato LocalDate ("2026-06-24"). Incluye las dos puntas. */
export interface RangoEstadisticas {
  desde: string;
  hasta: string;
}

export interface PeriodResponse {
  from: string;
  to: string;
}

/**
 * Ojo: occupancyRate no cuenta los turnos libres (es reservados sobre reservados + cancelados
 * + suspendidos). Para la ocupación real del día hay que calcularla con la lista de turnos.
 */
export interface AppointmentStatsDto {
  total: number;
  finished: number;
  upcoming: number;
  cancelled: number;
  suspended: number;
  occupancyRate: number;
  cancellationRate: number;
}

export interface RevenueStatsDto {
  /** Solo turnos BOOKED que ya terminaron. */
  totalFromFinished: number;
  depositsCollected: number;
  depositsRefunded: number;
  depositsForfeited: number;
}

export interface ServiceStatsDto {
  serviceName: string;
  appointmentCount: number;
  revenue: number;
}

export interface EmployeeSummaryDto {
  employeeId: string;
  employeeName: string;
  appointmentCount: number;
  revenue: number;
}

export interface DayStatsDto {
  dayOfWeek: string;
  appointmentCount: number;
}

export interface BusinessStatsResponse {
  period: PeriodResponse;
  appointments: AppointmentStatsDto;
  revenue: RevenueStatsDto;
  byService: ServiceStatsDto[];
  byEmployee: EmployeeSummaryDto[];
  peakDays: DayStatsDto[];
  uniqueClientsCount: number;
}

export interface EmployeeAppointmentStatsDto {
  total: number;
  finished: number;
  upcoming: number;
  cancelled: number;
  occupancyRate: number;
}

export interface EmployeeStatsResponse {
  employeeId: string;
  employeeName: string;
  period: PeriodResponse;
  appointments: EmployeeAppointmentStatsDto;
  hoursWorked: number;
  revenueGenerated: number;
  byService: ServiceStatsDto[];
}

export interface AdminAppointmentStatsDto {
  total: number;
  finished: number;
  cancelled: number;
  suspended: number;
}

export interface BusinessSummaryDto {
  businessId: string;
  businessName: string;
  appointmentCount: number;
  revenue: number;
}

/** month: 1 = enero ... 12 = diciembre. Sólo vienen los meses con altas. */
export interface GrowthPointDto {
  year: number;
  month: number;
  newUsers: number;
}

/**
 * totalBusinesses no cuenta los dados de baja y totalUsers no cuenta los inactivos.
 * userGrowth no depende del período: son siempre los últimos 6 meses.
 */
export interface AdminStatsResponse {
  period: PeriodResponse;
  totalBusinesses: number;
  /** Negocios con al menos un turno en el período. */
  activeBusinessesInPeriod: number;
  totalUsers: number;
  newUsersInPeriod: number;
  appointments: AdminAppointmentStatsDto;
  revenue: RevenueStatsDto;
  /** Hasta 10, de más a menos turnos. */
  topBusinesses: BusinessSummaryDto[];
  userGrowth: GrowthPointDto[];
}
