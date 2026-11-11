import { BusinessTypeResponse } from '../../../core/models/negocio';
import { ServResponse } from '../../../core/models/servicio';
import { AppointmentResponse } from '../../../core/models/turno';

// Funciones que usa la pagina del negocio (NegocioPage) para armar lo que se ve: el calendario,
// los horarios, la seña y los datos de la cabecera. No tocan la pantalla ni llaman al back, solo
// reciben datos y devuelven el resultado. Por eso estan separadas y se testean en reserva.spec.ts

// Un casillero del calendario. semanasDelMes devuelve una grilla con estos.
// Los casilleros de relleno (antes del dia 1 y despues del ultimo) van vacios.
export interface DiaCalendario {
  // la fecha en formato aaaa-mm-dd, por ejemplo 2026-11-12. En los de relleno queda vacia
  clave: string;
  // el numero que se muestra. En los de relleno es null
  numero: number | null;
  // si ese dia tiene algun turno libre. Solo esos dias se pueden tocar
  libre: boolean;
}

// desde esta hora los turnos van en "Tarde", los de antes en "Mañana"
const HORA_TARDE = 13;

// si el servicio no tiene porcentaje de seña o tiene uno que no sirve (0 o mas de 100),
// el back cobra 30%. Lo repetimos aca para mostrarle al cliente lo mismo que le van a cobrar
const SENA_POR_DEFECTO = 30;

// el back guarda los rubros en mayuscula y sin tildes (PELUQUERIA), asi que los que llevan tilde
// los escribimos a mano. Los que no estan aca se muestran con la primera letra en mayuscula nomas
const NOMBRES_RUBRO: Record<string, string> = {
  PELUQUERIA: 'Peluquería',
  ESTETICA: 'Estética',
  FOTOGRAFIA: 'Fotografía',
  ODONTOLOGIA: 'Odontología',
  PSICOLOGIA: 'Psicología',
  BARBERIA: 'Barbería',
  NUTRICION: 'Nutrición',
};

// le pone un cero adelante a los numeros de un digito, 5 queda 05 y 12 queda igual
function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

// Pasa un Date a texto aaaa-mm-dd, por ejemplo el 3 de noviembre de 2026 queda 2026-11-03.
// Usamos la fecha local y no toISOString() porque esa trabaja en UTC, y como en Argentina
// estamos 3 horas atras, a la noche te devuelve el dia siguiente.
export function claveDeFecha(fecha: Date): string {
  // getMonth() cuenta los meses desde 0 (enero es 0, noviembre es 10), por eso el + 1
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

// Devuelve el dia de un turno en formato aaaa-mm-dd.
// El back manda la fecha como texto, por ejemplo 2026-11-12T09:30:00, y sin zona horaria.
// Con quedarnos con los primeros 10 caracteres ya tenemos el dia. Si lo pasaramos a Date
// se podria correr de dia por la zona horaria.
export function claveDeTurno(turno: AppointmentResponse): string {
  return turno.startDatetime.slice(0, 10);
}

// Devuelve el primer dia del mes de una fecha aaaa-mm-dd. Por ejemplo 2026-11-29 da el
// 1 de noviembre de 2026. La pagina la usa para saber que mes mostrar en el calendario
// y hasta que mes se puede avanzar.
export function mesDeClave(clave: string): Date {
  const [anio, mes] = clave.split('-').map(Number);
  return new Date(anio, mes - 1, 1);
}

// Junta los turnos libres por dia. Devuelve un Map donde la clave es el dia (aaaa-mm-dd)
// y el valor son los turnos de ese dia ordenados por hora.
// Por ejemplo, si llegan turnos del 12 a las 15:00, del 13 a las 9:00 y del 12 a las 9:30,
// queda el 12 con 9:30 y 15:00, y el 13 con 9:00.
// La pagina lo usa para marcar en el calendario los dias que tienen turnos, para listar los
// horarios del dia elegido y para saber cual es el ultimo mes con turnos.
export function agruparPorDia(turnos: AppointmentResponse[]): Map<string, AppointmentResponse[]> {
  // copiamos la lista para no desordenar la original. Como las fechas vienen como texto
  // (2026-11-12T09:30:00), ordenarlas como texto ya las deja ordenadas por fecha y hora
  const ordenados = [...turnos].sort((a, b) => a.startDatetime.localeCompare(b.startDatetime));
  const dias = new Map<string, AppointmentResponse[]>();
  for (const turno of ordenados) {
    const clave = claveDeTurno(turno);
    dias.set(clave, [...(dias.get(clave) ?? []), turno]);
  }
  return dias;
}

// Arma el calendario de un mes como una lista de semanas, cada una con 7 casilleros
// de lunes a domingo.
// mes: el mes a mostrar (la pagina siempre pasa el dia 1)
// diasLibres: los dias que tienen turnos libres, en formato aaaa-mm-dd
// Por ejemplo noviembre de 2026 arranca un domingo, entonces la primera semana tiene
// 6 casilleros vacios y despues el 1.
export function semanasDelMes(mes: Date, diasLibres: ReadonlySet<string>): DiaCalendario[][] {
  const anio = mes.getFullYear();
  const numeroMes = mes.getMonth();
  const hueco: DiaCalendario = { clave: '', numero: null, libre: false };

  // getDay() devuelve 0 para el domingo, 1 para el lunes y asi. Sumandole 6 y sacando el resto
  // de dividir por 7 queda lunes 0 y domingo 6, que es la cantidad de vacios antes del dia 1
  const dias: DiaCalendario[] = Array((new Date(anio, numeroMes, 1).getDay() + 6) % 7).fill(hueco);

  // el dia 0 del mes siguiente es el ultimo dia de este mes, asi sabemos si tiene 28, 30 o 31
  const cantidad = new Date(anio, numeroMes + 1, 0).getDate();
  for (let numero = 1; numero <= cantidad; numero++) {
    const clave = claveDeFecha(new Date(anio, numeroMes, numero));
    dias.push({ clave, numero, libre: diasLibres.has(clave) });
  }

  // agregamos vacios al final hasta completar la ultima semana
  while (dias.length % 7) dias.push(hueco);

  // cortamos la lista de a 7 para tener las semanas
  const semanas: DiaCalendario[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
  return semanas;
}

// Separa los horarios de un dia en los de la mañana y los de la tarde, que en la pagina
// se muestran en dos grupos. Si alguno queda vacio la pagina no lo muestra.
export function separarPorTurno(turnos: AppointmentResponse[]): {
  manana: AppointmentResponse[];
  tarde: AppointmentResponse[];
} {
  // la hora esta en los caracteres 11 y 12 del texto, en 2026-11-12T15:00:00 es el 15
  const esTarde = (t: AppointmentResponse) => Number(t.startDatetime.slice(11, 13)) >= HORA_TARDE;
  return { manana: turnos.filter((t) => !esTarde(t)), tarde: turnos.filter(esTarde) };
}

// Porcentaje de seña de un servicio. Cada servicio tiene el suyo. Hace lo mismo que el back:
// si esta entre 1 y 100 usa ese, si no cobra el 30%.
// Recibe cualquier objeto que tenga depositPorcentage, asi en los tests alcanza con pasarle
// { depositPorcentage: 50 } sin armar un servicio entero.
export function porcentajeSena(servicio: Pick<ServResponse, 'depositPorcentage'>): number {
  const porcentaje = servicio.depositPorcentage;
  return porcentaje > 0 && porcentaje <= 100 ? porcentaje : SENA_POR_DEFECTO;
}

// Cuanta plata hay que pagar de seña: el precio por el porcentaje dividido 100, redondeado.
// Por ejemplo un servicio de $12.500 con seña del 30% da $3.750.
// Se usa en la pastilla de arriba, en el resumen de la reserva y en el boton de reservar.
export function montoSena(
  precio: number,
  servicio: Pick<ServResponse, 'depositPorcentage'>,
): number {
  return Math.round((precio * porcentajeSena(servicio)) / 100);
}

// Nombre del rubro para mostrar en la cabecera. Si esta en NOMBRES_RUBRO usa ese
// (PELUQUERIA queda Peluquería). Si no, por ejemplo GYM o un rubro nuevo que cargue el admin,
// lo deja con la primera letra en mayuscula y el resto en minuscula (Gym).
export function nombreRubro(rubro: BusinessTypeResponse): string {
  const nombre = rubro.name.trim();
  return NOMBRES_RUBRO[nombre] ?? nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();
}

// Las letras que van en el cuadrado de la cabecera: la primera letra de las dos primeras
// palabras del nombre, en mayuscula. Barberia del Puerto queda BD.
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/) // separa por espacios, aunque haya mas de uno seguido
    .slice(0, 2)
    .map((palabra) => palabra[0] ?? '')
    .join('')
    .toUpperCase();
}
