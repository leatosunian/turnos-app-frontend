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
