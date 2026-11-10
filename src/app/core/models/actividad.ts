/** Período que entiende el back en /stats. Sin período usa MONTH. */
export type PeriodoActividad = 'WEEK' | 'MONTH' | 'YEAR';

export interface PeriodoFechas {
  /** Primer día (yyyy-MM-dd). */
  from: string;
  /** Último día incluido (yyyy-MM-dd). */
  to: string;
}

export interface TurnosEmpleado {
  total: number;
  finished: number;
  upcoming: number;
  cancelled: number;
  occupancyRate: number;
}

export interface ServicioEmpleado {
  serviceName: string;
  appointmentCount: number;
  /** Hoy el back lo manda siempre en 0 (pedido al back). */
  revenue: number;
}

/** GET /businesses/{id}/stats/employees/{empId}. Lo ve el dueño o el mismo empleado. */
export interface EmployeeStatsResponse {
  employeeId: string;
  employeeName: string;
  period: PeriodoFechas;
  appointments: TurnosEmpleado;
  /** Solo turnos terminados. */
  hoursWorked: number;
  /** Solo turnos terminados. */
  revenueGenerated: number;
  byService: ServicioEmpleado[];
}

function aIso(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/**
 * El período anterior al actual, con las mismas reglas que el back: la semana va de lunes a
 * domingo, el mes y el año arrancan el día 1.
 */
export function periodoAnterior(periodo: PeriodoActividad, hoy: Date = new Date()): PeriodoFechas {
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  switch (periodo) {
    case 'WEEK': {
      const lunes = new Date(y, m, hoy.getDate() - ((hoy.getDay() + 6) % 7));
      return {
        from: aIso(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7)),
        to: aIso(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 1)),
      };
    }
    case 'MONTH':
      return { from: aIso(new Date(y, m - 1, 1)), to: aIso(new Date(y, m, 0)) };
    case 'YEAR':
      return { from: aIso(new Date(y - 1, 0, 1)), to: aIso(new Date(y - 1, 11, 31)) };
  }
}
