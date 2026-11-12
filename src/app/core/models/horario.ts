// Tipos de la agenda semanal y de la plantilla de turnos, que se configuran en la pantalla de
// Horarios (HorariosPage).

// Asi nombra el back a los dias de la semana. El orden importa: el back numera los turnos
// programados con dayNumber de 0 a 6 siguiendo este mismo orden, asi que LUN es 0 y DOM es 6
export type DiaSemana = 'LUN' | 'MAR' | 'MIE' | 'JUE' | 'VIE' | 'SAB' | 'DOM';

// Horario de atencion de un dia (el DaySchedule del back). Cada negocio tiene los 7 dias
// creados desde que se da de alta, todos cerrados y con las horas en null.
// Las horas vienen con segundos, por ejemplo 10:00:00.
export interface DayScheduleResponse {
  id: string;
  day: DiaSemana;
  dayStart: string | null;
  dayEnd: string | null;
  // cada cuantos minutos se parte la grilla de ese dia. El back no lo usa para generar turnos,
  // la pantalla lo usa para armar las filas, como el selector Intervalos de Sacaturno
  appointmentDuration: number | null;
  enabled: boolean;
  businessId: string;
}

// Lo que se manda en el PUT de la semana. Se puede mandar uno solo de los dias, los que no van
// en la lista quedan como estaban. Las horas se pueden mandar sin segundos (10:00).
// Ojo que el back ignora los campos que van en null, asi que con null no se borra una hora.
export interface DayScheduleUpdateRequest {
  day: DiaSemana;
  dayStart?: string;
  dayEnd?: string;
  // minimo 5
  appointmentDuration?: number;
  enabled: boolean;
}

// Un turno programado de la plantilla semanal (el AppointmentSchedule del back).
// Cada uno es UN turno: por ejemplo lunes de 10:00 a 10:45, Corte, con Lucia. Con la agenda
// automatica prendida el back lo repite en cada lunes habilitado de la ventana.
export interface AppointmentScheduleResponse {
  id: string;
  // 0 es lunes y 6 es domingo
  dayNumber: number;
  startTime: string;
  endTime: string;
  // el precio del servicio al momento de guardarlo
  price: number;
  businessId: string;
  serviceId: string;
  // null si no tiene profesional asignado
  employeeId: string | null;
}

export interface AppointmentScheduleRequest {
  dayNumber: number;
  startTime: string;
  endTime: string;
  serviceId: string;
  employeeId?: string | null;
}
