import { BusinessTypeResponse } from '../../../core/models/negocio';
import { ServResponse } from '../../../core/models/servicio';
import { AppointmentResponse } from '../../../core/models/turno';

export interface DiaCalendario {
  /** `aaaa-mm-dd`. Vacío en los huecos antes del 1 y después del último día. */
  clave: string;
  numero: number | null;
  libre: boolean;
}

/** Hora a partir de la cual un turno va en "Tarde". */
const HORA_TARDE = 13;

// Si el servicio no tiene porcentaje o está fuera de rango, el back cobra 30 %.
const SENA_POR_DEFECTO = 30;

// el back guarda los rubros como un enum en mayúscula y sin tildes
const NOMBRES_RUBRO: Record<string, string> = {
  PELUQUERIA: 'Peluquería',
  ESTETICA: 'Estética',
  FOTOGRAFIA: 'Fotografía',
  ODONTOLOGIA: 'Odontología',
  PSICOLOGIA: 'Psicología',
  BARBERIA: 'Barbería',
  NUTRICION: 'Nutrición',
};

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

export function claveDeFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** El back manda fechas locales sin zona (`2026-11-12T09:30:00`): el día son los primeros 10. */
export function claveDeTurno(turno: AppointmentResponse): string {
  return turno.startDatetime.slice(0, 10);
}

/** Primer día del mes de una clave `aaaa-mm-dd`. */
export function mesDeClave(clave: string): Date {
  const [anio, mes] = clave.split('-').map(Number);
  return new Date(anio, mes - 1, 1);
}

export function agruparPorDia(turnos: AppointmentResponse[]): Map<string, AppointmentResponse[]> {
  const ordenados = [...turnos].sort((a, b) => a.startDatetime.localeCompare(b.startDatetime));
  const dias = new Map<string, AppointmentResponse[]>();
  for (const turno of ordenados) {
    const clave = claveDeTurno(turno);
    dias.set(clave, [...(dias.get(clave) ?? []), turno]);
  }
  return dias;
}

/** Semanas del mes, de lunes a domingo, con los huecos de las puntas vacíos. */
export function semanasDelMes(mes: Date, diasLibres: ReadonlySet<string>): DiaCalendario[][] {
  const anio = mes.getFullYear();
  const numeroMes = mes.getMonth();
  const hueco: DiaCalendario = { clave: '', numero: null, libre: false };

  const dias: DiaCalendario[] = Array((new Date(anio, numeroMes, 1).getDay() + 6) % 7).fill(hueco);
  const cantidad = new Date(anio, numeroMes + 1, 0).getDate();
  for (let numero = 1; numero <= cantidad; numero++) {
    const clave = claveDeFecha(new Date(anio, numeroMes, numero));
    dias.push({ clave, numero, libre: diasLibres.has(clave) });
  }
  while (dias.length % 7) dias.push(hueco);

  const semanas: DiaCalendario[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
  return semanas;
}

export function separarPorTurno(turnos: AppointmentResponse[]): {
  manana: AppointmentResponse[];
  tarde: AppointmentResponse[];
} {
  const esTarde = (t: AppointmentResponse) => Number(t.startDatetime.slice(11, 13)) >= HORA_TARDE;
  return { manana: turnos.filter((t) => !esTarde(t)), tarde: turnos.filter(esTarde) };
}

export function porcentajeSena(servicio: Pick<ServResponse, 'depositPorcentage'>): number {
  const porcentaje = servicio.depositPorcentage;
  return porcentaje > 0 && porcentaje <= 100 ? porcentaje : SENA_POR_DEFECTO;
}

export function montoSena(
  precio: number,
  servicio: Pick<ServResponse, 'depositPorcentage'>,
): number {
  return Math.round((precio * porcentajeSena(servicio)) / 100);
}

export function nombreRubro(rubro: BusinessTypeResponse): string {
  const nombre = rubro.name.trim();
  return NOMBRES_RUBRO[nombre] ?? nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();
}

export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0] ?? '')
    .join('')
    .toUpperCase();
}
