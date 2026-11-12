import { PeriodoEstadisticas, RangoEstadisticas } from './estadisticas';

/** Los períodos que ofrece Mi actividad (el back también acepta TODAY, acá no se usa). */
export type PeriodoActividad = Exclude<PeriodoEstadisticas, 'TODAY'>;

function aIso(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/**
 * El período anterior al actual, con las mismas reglas que el back: la semana va de lunes a
 * domingo, el mes y el año arrancan el día 1.
 */
export function periodoAnterior(
  periodo: PeriodoActividad,
  hoy: Date = new Date(),
): RangoEstadisticas {
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  switch (periodo) {
    case 'WEEK': {
      const lunes = new Date(y, m, hoy.getDate() - ((hoy.getDay() + 6) % 7));
      return {
        desde: aIso(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7)),
        hasta: aIso(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 1)),
      };
    }
    case 'MONTH':
      return { desde: aIso(new Date(y, m - 1, 1)), hasta: aIso(new Date(y, m, 0)) };
    case 'YEAR':
      return { desde: aIso(new Date(y - 1, 0, 1)), hasta: aIso(new Date(y - 1, 11, 31)) };
  }
}
