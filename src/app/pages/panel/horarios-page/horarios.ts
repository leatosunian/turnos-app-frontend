import {
  AppointmentScheduleRequest,
  AppointmentScheduleResponse,
  DayScheduleResponse,
  DiaSemana,
} from '../../../core/models/horario';

// Funciones que usa la pantalla de Horarios (HorariosPage) para armar la grilla de la plantilla
// semanal, validar los turnos programados, armar las tandas de Asignar en lote y el resumen de la
// agenda automatica. No tocan la pantalla ni llaman al back, solo reciben datos y devuelven el
// resultado, asi que se testean aparte en horarios.spec.ts

// Lo que muestra la pantalla de cada dia. numero es el dayNumber del back (lunes 0, domingo 6)
export interface InfoDia {
  dia: DiaSemana;
  numero: number;
  corto: string;
  largo: string;
}

// En el mismo orden que el back, asi la posicion en la lista coincide con el dayNumber
export const DIAS: InfoDia[] = [
  { dia: 'LUN', numero: 0, corto: 'Lun', largo: 'Lunes' },
  { dia: 'MAR', numero: 1, corto: 'Mar', largo: 'Martes' },
  { dia: 'MIE', numero: 2, corto: 'Mié', largo: 'Miércoles' },
  { dia: 'JUE', numero: 3, corto: 'Jue', largo: 'Jueves' },
  { dia: 'VIE', numero: 4, corto: 'Vie', largo: 'Viernes' },
  { dia: 'SAB', numero: 5, corto: 'Sáb', largo: 'Sábado' },
  { dia: 'DOM', numero: 6, corto: 'Dom', largo: 'Domingo' },
];

// Horario que le proponemos a un dia la primera vez que se abre. Un negocio recien creado tiene
// los 7 dias cerrados y con las horas en null, y sin horas no hay grilla que mostrar
export const DIA_POR_DEFECTO = { inicio: '09:00', fin: '18:00', intervalo: 30 };

// Opciones del selector Intervalos, en minutos. El back pide minimo 5
export const INTERVALOS = [15, 20, 30, 45, 60, 90, 120];

// Colores de las tarjetas, uno por profesional. Los turnos sin profesional van en neutro
export type TonoProfesional = 'ambar' | 'menta' | 'cielo' | 'coral' | 'neutro';
const TONOS: TonoProfesional[] = ['ambar', 'menta', 'cielo', 'coral'];

// Una fila de la grilla: la hora de la fila y los turnos programados que arrancan en esa franja
export interface FilaGrilla {
  hora: string;
  turnos: AppointmentScheduleResponse[];
}

// Lo minimo para saber si dos turnos programados se pisan. Sirve tanto para los que ya estan
// guardados como para los que se van a mandar
type Rango = Pick<AppointmentScheduleRequest, 'dayNumber' | 'startTime' | 'endTime' | 'employeeId'>;

// Lo que el dueño completa en el dialogo de Asignar en lote
export interface PedidoLote {
  // los dayNumber elegidos, por ejemplo [0, 2] para lunes y miercoles
  dias: number[];
  desde: string;
  hasta: string;
  // cada cuantos minutos arranca un turno
  cada: number;
  // cuanto dura el servicio, que es lo que dura cada turno
  duracion: number;
  serviceId: string;
  employeeId: string | null;
}

// le pone un cero adelante a los numeros de un digito, 5 queda 05 y 12 queda igual
function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

// Pasa una hora a minutos desde la medianoche, asi se pueden comparar y sumar.
// Acepta con o sin segundos: 10:45 y 10:45:00 dan 645
export function aMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

// Lo contrario de aMinutos: 645 da 10:45
export function aHora(minutos: number): string {
  return `${dosDigitos(Math.floor(minutos / 60))}:${dosDigitos(minutos % 60)}`;
}

// El back manda las horas con segundos (10:00:00) y en pantalla van sin, asi que cortamos
// los primeros 5 caracteres
export function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

// Ordena los dias de lunes a domingo. Hace falta porque el back los devuelve en cualquier orden.
// Devuelve una copia, la lista original queda como estaba
export function ordenarSemana(dias: DayScheduleResponse[]): DayScheduleResponse[] {
  const posicion = (dia: DiaSemana) => DIAS.findIndex((info) => info.dia === dia);
  return [...dias].sort((a, b) => posicion(a.day) - posicion(b.day));
}

// Las horas que se pueden elegir en los selectores Desde y Hasta, cada 15 minutos por defecto.
// Con paso 15 arranca en 00:00, 00:15, 00:30 y termina en 23:45
export function opcionesDeHora(paso = 15): string[] {
  const horas: string[] = [];
  for (let minutos = 0; minutos < 24 * 60; minutos += paso) horas.push(aHora(minutos));
  return horas;
}

// Suma una hora a la lista de opciones de un select si no estaba, en su lugar segun la hora.
// Hace falta porque un select no puede mostrar un valor que no esta entre sus opciones: si un
// dia cierra 23:59 (cargado desde Swagger) y las opciones van de a 15, el select mostraria 00:00.
// Por ejemplo con 10:00, 10:15 y 10:30, sumar 10:20 deja 10:00, 10:15, 10:20 y 10:30.
// Acepta la hora con segundos (23:59:00) y la deja sin.
export function conHora(horas: string[], hora: string | null): string[] {
  if (!hora) return horas;
  const corta = horaCorta(hora);
  // como todas tienen el formato hh:mm, ordenarlas como texto ya las ordena por hora
  return horas.includes(corta) ? horas : [...horas, corta].sort();
}

// Arma la grilla de un dia: una fila por cada intervalo entre la hora de inicio y la de fin,
// y en cada fila los turnos programados que arrancan en esa franja, ordenados por hora.
// turnos: los turnos programados de ese dia
// Por ejemplo de 10:00 a 12:00 cada 45 quedan las filas 10:00, 10:45 y 11:30, y un turno que
// arranca a las 11:00 cae en la de 10:45.
// Los que arrancan antes del inicio o desde el fin en adelante no tienen fila (pasa si el dueño
// achica el horario despues de cargarlos), asi que van aparte en fueraDeHorario para avisarle.
export function armarGrilla(
  turnos: AppointmentScheduleResponse[],
  inicio: string,
  fin: string,
  intervalo: number,
): { filas: FilaGrilla[]; fueraDeHorario: AppointmentScheduleResponse[] } {
  const desde = aMinutos(inicio);
  const hasta = aMinutos(fin);
  const filas: FilaGrilla[] = [];
  for (let minutos = desde; minutos < hasta; minutos += intervalo) {
    filas.push({ hora: aHora(minutos), turnos: [] });
  }

  const fueraDeHorario: AppointmentScheduleResponse[] = [];
  // ordenados por hora de inicio. Las horas vienen como texto con el mismo formato (10:00:00),
  // asi que compararlas como texto ya las ordena bien
  const ordenados = [...turnos].sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (const turno of ordenados) {
    const arranca = aMinutos(turno.startTime);
    if (arranca < desde || arranca >= hasta) {
      fueraDeHorario.push(turno);
      continue;
    }
    // cuantos intervalos enteros entran entre el inicio del dia y el turno: con inicio 10:00,
    // intervalo 45 y un turno a las 11:00 son 60 / 45, que redondeado para abajo da la fila 1
    filas[Math.floor((arranca - desde) / intervalo)].turnos.push(turno);
  }
  return { filas, fueraDeHorario };
}

// El color de la tarjeta segun el profesional. Se reparten en el orden en que viene el equipo
// del back, y despues del cuarto se repiten: el quinto vuelve a ambar.
// equipo: los ids de los profesionales, en el orden de la lista del back
// Sin profesional, o con uno que ya no esta en el equipo, va en neutro (gris).
export function tonoDeProfesional(employeeId: string | null, equipo: string[]): TonoProfesional {
  const posicion = employeeId ? equipo.indexOf(employeeId) : -1;
  // el resto de dividir por 4 da la vuelta a la lista: la posicion 5 usa el color 1
  return posicion === -1 ? 'neutro' : TONOS[posicion % TONOS.length];
}

// Si dos turnos programados chocan, con la misma regla que usa el back para responder 409:
// mismo dia, mismo profesional y que los horarios se pisen. Sin profesional solo choca con otro
// sin profesional. Que uno termine justo cuando el otro empieza no es choque, por ejemplo
// 10:00 a 10:45 y 10:45 a 11:30 entran los dos.
export function seSuperponen(a: Rango, b: Rango): boolean {
  return (
    a.dayNumber === b.dayNumber &&
    (a.employeeId ?? null) === (b.employeeId ?? null) &&
    aMinutos(a.startTime) < aMinutos(b.endTime) &&
    aMinutos(a.endTime) > aMinutos(b.startTime)
  );
}

// Revisa un turno programado antes de mandarlo, para mostrar el error en el dialogo sin ir al
// back. Devuelve el mensaje o null si esta bien.
// duracion: lo que dura el servicio elegido, en minutos
// dia: el horario de atencion de ese dia, para que el turno no quede afuera de la grilla
// Por ejemplo un Corte de 45 min de 12:00 a 12:30 no entra, y de 12:00 a 12:45 si.
export function errorDeTurno(
  inicio: string,
  fin: string,
  duracion: number,
  dia: Pick<DayScheduleResponse, 'dayStart' | 'dayEnd'>,
): string | null {
  const desde = aMinutos(inicio);
  const hasta = aMinutos(fin);
  if (hasta <= desde) return 'La hora de fin tiene que ser después de la de inicio.';
  if (hasta - desde < duracion) {
    return `El servicio dura ${duracion} min y no entra entre ${horaCorta(inicio)} y ${horaCorta(fin)}.`;
  }
  if (
    dia.dayStart &&
    dia.dayEnd &&
    (desde < aMinutos(dia.dayStart) || hasta > aMinutos(dia.dayEnd))
  ) {
    return `Queda fuera del horario del día (${horaCorta(dia.dayStart)} a ${horaCorta(dia.dayEnd)}).`;
  }
  return null;
}

// Las horas de arranque de los turnos de una tanda. Solo entran los que terminan antes del
// limite: de 10:00 a 13:00 cada 45, con un servicio de 45, da 10:00, 10:45, 11:30 y 12:15.
// Uno a las 13:00 ya terminaria 13:45, asi que no va.
export function horariosDelRango(
  desde: string,
  hasta: string,
  cada: number,
  duracion: number,
): string[] {
  const horarios: string[] = [];
  const limite = aMinutos(hasta);
  for (let minutos = aMinutos(desde); minutos + duracion <= limite; minutos += cada) {
    horarios.push(aHora(minutos));
  }
  return horarios;
}

// Arma los turnos programados de la funcionalidad Asignar en lote: uno por cada horario del rango en cada dia
// elegido. Los que chocarian con uno que ya existe van aparte en choques y no se mandan, asi el
// dueño los ve en la vista previa antes de confirmar.
// existentes: los turnos programados que ya estan guardados
// Tambien se revisan contra los del mismo lote, porque si cada es menor que la duracion (cada
// 30 con un servicio de 45) se pisarian entre ellos y el back rechazaria la mitad.
export function armarLote(
  pedido: PedidoLote,
  existentes: Rango[],
): { aCrear: AppointmentScheduleRequest[]; choques: AppointmentScheduleRequest[] } {
  const aCrear: AppointmentScheduleRequest[] = [];
  const choques: AppointmentScheduleRequest[] = [];
  const horarios = horariosDelRango(pedido.desde, pedido.hasta, pedido.cada, pedido.duracion);
  // ordenamos los dias para que la vista previa y los pedidos vayan de lunes a domingo
  for (const dayNumber of [...pedido.dias].sort((a, b) => a - b)) {
    for (const inicio of horarios) {
      const turno: AppointmentScheduleRequest = {
        dayNumber,
        startTime: inicio,
        endTime: aHora(aMinutos(inicio) + pedido.duracion),
        serviceId: pedido.serviceId,
        employeeId: pedido.employeeId,
      };
      const choca = [...existentes, ...aCrear].some((otro) => seSuperponen(turno, otro));
      (choca ? choques : aCrear).push(turno);
    }
  }
  return { aCrear, choques };
}

// Cuantos turnos genera la plantilla por semana: los turnos programados de los dias abiertos.
// Los de un dia cerrado se guardan pero no generan nada. Va en el resumen de la agenda automatica.
export function turnosPorSemana(
  plantilla: AppointmentScheduleResponse[],
  semana: DayScheduleResponse[],
): number {
  const abiertos = new Set(
    semana
      .filter((dia) => dia.enabled)
      .map((dia) => DIAS.findIndex((info) => info.dia === dia.day)),
  );
  return plantilla.filter((turno) => abiertos.has(turno.dayNumber)).length;
}

// Que dia va a renovar la agenda el back, para el resumen de la agenda automatica.
// El cron corre todas las madrugadas a las 02:00 y renueva cuando faltan anticipacion dias o
// menos para scheduleEnd (el ultimo dia cargado). Asi que la fecha es scheduleEnd menos la
// anticipacion, pero si esa fecha ya llego o paso, la renovacion es la proxima madrugada.
// Por ejemplo con la agenda cargada hasta el 10/12 y 5 de anticipacion, renueva el 5/12.
// Devuelve null si todavia no hay nada cargado.
// hoy: se puede pasar para los tests, por defecto es la fecha actual
export function proximaRenovacion(
  scheduleEnd: string | null,
  anticipacion: number,
  hoy: Date = new Date(),
): Date | null {
  if (!scheduleEnd) return null;
  // armamos la fecha con anio, mes y dia y no con new Date(texto), porque ese lo toma en UTC
  // y en Argentina se puede correr un dia para atras. getMonth cuenta desde 0, de ahi el - 1
  const [anio, mes, dia] = scheduleEnd.slice(0, 10).split('-').map(Number);
  const renovacion = new Date(anio, mes - 1, dia - anticipacion);
  const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  return renovacion < manana ? manana : renovacion;
}
