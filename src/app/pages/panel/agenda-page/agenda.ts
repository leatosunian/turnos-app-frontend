import { AppointmentResponse } from '../../../core/models/turno';
import { DIAS, aHora, aMinutos } from '../horarios-page/horarios';

// Funciones que usa la pantalla de Agenda (AgendaPage) para moverse por semanas, armar las filas
// del dia elegido y revisar un turno nuevo antes de mandarlo. No tocan la pantalla ni llaman al
// back, asi que se testean aparte en agenda.spec.ts.
// Las fechas del back vienen sin zona (2026-11-10T09:30:00) y son la hora del negocio, asi que
// en todo el archivo se trabaja con la fecha local y se compara el texto, sin pasar por UTC.

// Un dia de la semana que se muestra en las pestañas
export interface DiaAgenda {
  fecha: Date;
  // aaaa-mm-dd, para compararlo con el principio de startDatetime
  clave: string;
  // lunes 0 y domingo 6, igual que en Horarios
  numero: number;
  corto: string;
  largo: string;
  esHoy: boolean;
}

// Una fila del dia: la hora de la fila y los turnos que arrancan en esa franja
export interface FilaAgenda {
  hora: string;
  turnos: AppointmentResponse[];
}

// Lo que el dueño elige en el filtro de profesional: vacio es todo el equipo, SIN_ASIGNAR son
// los turnos sin profesional y cualquier otro valor es el id de un profesional
export const SIN_ASIGNAR = 'sin-asignar';

// Los meses en corto para el titulo de la semana. getMonth cuenta desde 0, asi que enero es el 0
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// le pone un cero adelante a los numeros de un digito, 5 queda 05 y 12 queda igual
function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

// La fecha como la usa el back y la URL, en hora local: el 9 de noviembre de 2026 da 2026-11-09.
// getMonth arranca en 0, por eso el + 1
export function claveDia(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

// Lo contrario de claveDia: lee el ?semana= de la URL. Si viene cualquier cosa devuelve null y la
// pantalla arranca en la semana de hoy.
// Se arma con anio, mes y dia y no con new Date(texto), porque ese lo toma en UTC y en Argentina
// se corre al dia anterior. Tambien se revisa que la fecha exista: 2026-02-31 da null y no marzo.
export function fechaDeClave(clave: string | null | undefined): Date | null {
  if (!clave || !/^\d{4}-\d{2}-\d{2}$/.test(clave)) return null;
  const [anio, mes, dia] = clave.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return claveDia(fecha) === clave ? fecha : null;
}

// Suma (o resta, con n negativo) dias a una fecha sin tocar la original. Date se encarga de
// pasar de mes: el 30 de noviembre mas 3 da el 3 de diciembre
export function sumarDias(fecha: Date, n: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + n);
}

// El lunes de la semana de una fecha, a las 00:00. getDay cuenta desde el domingo (domingo 0,
// lunes 1), asi que con (getDay() + 6) % 7 queda lunes 0 y domingo 6, que es cuantos dias hay
// que volver para caer en el lunes. Por ejemplo el jueves 12/11/2026 da el lunes 9/11 y el
// domingo 15/11 tambien da el 9/11, porque la semana arranca el lunes
export function lunesDeSemana(fecha: Date): Date {
  return sumarDias(fecha, -((fecha.getDay() + 6) % 7));
}

// Los 7 dias de la semana que arranca en lunes, para las pestañas.
// hoy: para marcar la pestaña del dia actual, se puede pasar en los tests
export function diasDeLaSemana(lunes: Date, hoy: Date = new Date()): DiaAgenda[] {
  const claveHoy = claveDia(hoy);
  return DIAS.map((info) => {
    const fecha = sumarDias(lunes, info.numero);
    const clave = claveDia(fecha);
    return {
      fecha,
      clave,
      numero: info.numero,
      corto: info.corto,
      largo: info.largo,
      esHoy: clave === claveHoy,
    };
  });
}

// Las fechas de la semana que van en el centro del dock de navegacion de la agenda. Si la semana
// cruza de mes se nombran los dos: del lunes 9/11 da "9 al 15 nov" y del lunes 26/10 da
// "26 oct al 1 nov"
export function rangoDeSemana(lunes: Date): string {
  const domingo = sumarDias(lunes, 6);
  const mesDomingo = MESES[domingo.getMonth()];
  const desde =
    lunes.getMonth() === domingo.getMonth()
      ? `${lunes.getDate()}`
      : `${lunes.getDate()} ${MESES[lunes.getMonth()]}`;
  return `${desde} al ${domingo.getDate()} ${mesDomingo}`;
}

// La hora de un startDatetime o endDatetime, sin segundos. Las fechas del back tienen siempre el
// mismo formato (2026-11-10T09:30:00), asi que los caracteres 11 a 15 son la hora: 09:30
export function horaDe(fechaHora: string): string {
  return fechaHora.slice(11, 16);
}

// Los turnos de un dia, ordenados por hora. El dia sale de los primeros 10 caracteres de
// startDatetime, que es la fecha: 2026-11-10T09:30:00 es del 2026-11-10.
// Como todas las fechas tienen el mismo formato, ordenarlas como texto ya las ordena por hora
export function turnosDelDia(turnos: AppointmentResponse[], clave: string): AppointmentResponse[] {
  return turnos
    .filter((turno) => turno.startDatetime.slice(0, 10) === clave)
    .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime));
}

// Los dias que tienen al menos un turno, para el puntito de las pestañas. Devuelve las claves:
// con turnos el martes y el jueves da un Set con 2026-11-10 y 2026-11-12
export function diasConTurnos(turnos: AppointmentResponse[]): Set<string> {
  return new Set(turnos.map((turno) => turno.startDatetime.slice(0, 10)));
}

// Aplica el filtro de profesional de arriba de la agenda.
// filtro: vacio deja todos, SIN_ASIGNAR deja los que no tienen profesional y si no es el id de
// uno, por ejemplo el de Lucia deja solo los turnos de Lucia
export function filtrarPorProfesional(
  turnos: AppointmentResponse[],
  filtro: string,
): AppointmentResponse[] {
  if (!filtro) return turnos;
  if (filtro === SIN_ASIGNAR) return turnos.filter((turno) => !turno.employeeId);
  return turnos.filter((turno) => turno.employeeId === filtro);
}

// Cuenta lo que se muestra al lado del nombre del dia: los turnos con cliente (reservados o
// esperando la seña) y los libres. Los cancelados y suspendidos no suman en ninguno.
// Por ejemplo 2 reservados, 1 cancelado y 2 libres da reservados 2 y libres 2
export function resumenDelDia(turnos: AppointmentResponse[]): {
  reservados: number;
  libres: number;
} {
  return {
    reservados: turnos.filter((t) => t.status === 'BOOKED' || t.status === 'AWAITING_PAYMENT')
      .length,
    libres: turnos.filter((t) => t.status === 'UNBOOKED').length,
  };
}

// Arma las filas del dia elegido igual que la grilla de Horarios: una fila por cada intervalo
// entre la hora de apertura y la de cierre, y en cada fila los turnos que arrancan en esa franja.
// turnos: los turnos de ese dia, ya ordenados por hora
// inicio, fin: el horario de atencion del dia (vienen como 09:00:00, se aceptan con o sin segundos)
// intervalo: cada cuantos minutos va una fila, el appointmentDuration del dia
// Por ejemplo de 09:00 a 11:00 cada 30 quedan 09:00, 09:30, 10:00 y 10:30, y un turno de las
// 09:45 cae en la de 09:30.
// Los que arrancan antes de abrir o desde el cierre en adelante no tienen fila (pasa si el dueño
// achico el horario despues de que se generaron), asi que van aparte en fueraDeHorario para
// mostrarlos abajo y que no se pierdan.
export function armarFilasDelDia(
  turnos: AppointmentResponse[],
  inicio: string,
  fin: string,
  intervalo: number,
): { filas: FilaAgenda[]; fueraDeHorario: AppointmentResponse[] } {
  const desde = aMinutos(inicio);
  const hasta = aMinutos(fin);
  const filas: FilaAgenda[] = [];
  // si el intervalo viene en 0 o negativo el for no terminaria nunca, asi que no armamos filas
  if (intervalo > 0) {
    for (let minutos = desde; minutos < hasta; minutos += intervalo) {
      filas.push({ hora: aHora(minutos), turnos: [] });
    }
  }

  const fueraDeHorario: AppointmentResponse[] = [];
  for (const turno of turnos) {
    const arranca = aMinutos(horaDe(turno.startDatetime));
    if (!filas.length || arranca < desde || arranca >= hasta) {
      fueraDeHorario.push(turno);
      continue;
    }
    // cuantos intervalos enteros entran entre la apertura y el turno: abriendo 09:00, de a 30
    // y con un turno a las 09:45 son 45 / 30, que redondeado para abajo da la fila 1
    filas[Math.floor((arranca - desde) / intervalo)].turnos.push(turno);
  }
  return { filas, fueraDeHorario };
}

// Si todavia se puede agregar un turno en una fila: la franja tiene que terminar despues de ahora.
// Asi en la fila de las 10:00 de a 30 se puede agregar hasta las 10:29, porque queda lugar para
// uno que arranque a las 10:15. En un dia que ya paso no se puede en ninguna.
// clave: el dia de la fila, hora: la hora de la fila, intervalo: lo que dura la fila en minutos
export function filaDisponible(
  clave: string,
  hora: string,
  intervalo: number,
  ahora: Date = new Date(),
): boolean {
  const dia = fechaDeClave(clave);
  if (!dia) return false;
  const finDeFila = new Date(dia.getTime());
  finDeFila.setMinutes(aMinutos(hora) + intervalo);
  return finDeFila.getTime() > ahora.getTime();
}

// Donde va la linea de la hora actual: en que fila y a que altura dentro de ella, en porcentaje.
// Solo aparece en el dia de hoy y dentro del horario del dia; si no, devuelve null.
// Por ejemplo abriendo 09:00, de a 30 y a las 10:15 va en la fila 2 (la de las 10:00) a la mitad,
// porque pasaron 15 de los 30 minutos de esa fila.
export function posicionDeAhora(
  clave: string,
  inicio: string,
  fin: string,
  intervalo: number,
  ahora: Date = new Date(),
): { fila: number; porcentaje: number } | null {
  if (clave !== claveDia(ahora) || intervalo <= 0) return null;
  const desde = aMinutos(inicio);
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  if (minutosAhora < desde || minutosAhora >= aMinutos(fin)) return null;
  const pasados = minutosAhora - desde;
  // el resto de la division son los minutos que van de la fila actual
  return {
    fila: Math.floor(pasados / intervalo),
    porcentaje: Math.round(((pasados % intervalo) / intervalo) * 100),
  };
}

// Las horas de inicio que se pueden elegir al crear un turno desde una fila: de a 5 minutos (lo
// minimo que maneja el back), desde la hora de la fila hasta antes de la siguiente, y solo las que
// todavia no pasaron. Por ejemplo en la fila de las 10:00 de a 30, a las 10:12, da 10:15, 10:20 y
// 10:25.
export function horasDeLaFila(
  clave: string,
  hora: string,
  intervalo: number,
  ahora: Date = new Date(),
): string[] {
  const horas: string[] = [];
  const dia = fechaDeClave(clave);
  if (!dia) return horas;
  const desde = aMinutos(hora);
  for (let minutos = desde; minutos < desde + intervalo; minutos += 5) {
    const momento = new Date(dia.getTime());
    momento.setMinutes(minutos);
    if (momento.getTime() > ahora.getTime()) horas.push(aHora(minutos));
  }
  return horas;
}

// Lo minimo para saber si un turno nuevo choca con uno que ya existe
type Rango = Pick<AppointmentResponse, 'startDatetime' | 'endDatetime' | 'employeeId'>;

// Busca el turno con el que chocaria uno nuevo, con la misma regla que usa el back para responder
// 409: mismo profesional y que los horarios se pisen. Sin profesional solo choca con otro sin
// profesional, y los cancelados o suspendidos ya liberaron el lugar, asi que no cuentan.
// Que uno termine justo cuando el otro empieza no es choque: 10:00 a 10:30 y 10:30 a 11:00 entran.
// Devuelve el turno con el que choca, para nombrarlo en el error, o null si no choca con ninguno.
export function turnoQueChoca(
  nuevo: Rango,
  existentes: AppointmentResponse[],
): AppointmentResponse | null {
  return (
    existentes.find(
      (otro) =>
        otro.status !== 'CANCELLED' &&
        otro.status !== 'SUSPENDED' &&
        (otro.employeeId ?? null) === (nuevo.employeeId ?? null) &&
        // las fechas tienen todas el mismo formato, asi que compararlas como texto alcanza
        nuevo.startDatetime < otro.endDatetime &&
        nuevo.endDatetime > otro.startDatetime,
    ) ?? null
  );
}

// Arma el inicio y el fin de un turno nuevo en el formato del back, sumandole la duracion del
// servicio. Por ejemplo el 2026-11-10 a las 09:30 con un servicio de 45 da de
// 2026-11-10T09:30:00 a 2026-11-10T10:15:00. Si pasa de la medianoche, aHora daria 24:15 y el
// back lo rechazaria, pero la pantalla no ofrece horas tan tarde
export function rangoDelTurno(
  clave: string,
  hora: string,
  duracion: number,
): { startDatetime: string; endDatetime: string } {
  return {
    startDatetime: `${clave}T${hora}:00`,
    endDatetime: `${clave}T${aHora(aMinutos(hora) + duracion)}:00`,
  };
}

// Para saber si ya se trajeron todas las paginas que hacen falta para una semana. Los turnos se
// piden del mas nuevo al mas viejo, asi que alcanza cuando el mas viejo que llego arranca antes
// del lunes de la semana, o cuando ya no quedan paginas.
// turnos: todo lo que se trajo hasta ahora, en el orden del back
// Por ejemplo para la semana del 9/11, si el ultimo que llego es del 8/11 ya no hace falta pedir
// mas, porque todo lo de esa semana vino antes.
export function alcanzaParaLaSemana(
  turnos: AppointmentResponse[],
  lunes: Date,
  quedanPaginas: boolean,
): boolean {
  if (!quedanPaginas) return true;
  const masViejo = turnos.at(-1);
  return !!masViejo && masViejo.startDatetime.slice(0, 10) < claveDia(lunes);
}

// Suma una pagina nueva a lo que ya se trajo sin repetir turnos. Pasa si se crea o se reserva un
// turno mientras se piden las paginas: todo se corre un lugar y el ultimo de una pagina vuelve a
// venir como primero de la siguiente
export function sumarSinRepetir(
  actuales: AppointmentResponse[],
  nuevos: AppointmentResponse[],
): AppointmentResponse[] {
  const vistos = new Set(actuales.map((turno) => turno.id));
  return [...actuales, ...nuevos.filter((turno) => !vistos.has(turno.id))];
}
