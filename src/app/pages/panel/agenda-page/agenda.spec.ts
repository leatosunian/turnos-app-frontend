import { AppointmentResponse } from '../../../core/models/turno';
import {
  SIN_ASIGNAR,
  alcanzaParaLaSemana,
  armarFilasDelDia,
  claveDia,
  diasConTurnos,
  diasDeLaSemana,
  fechaDeClave,
  filaDisponible,
  filtrarPorProfesional,
  horaDe,
  horasDeLaFila,
  lunesDeSemana,
  posicionDeAhora,
  rangoDelTurno,
  resumenDelDia,
  sumarDias,
  sumarSinRepetir,
  rangoDeSemana,
  turnoQueChoca,
  turnosDelDia,
} from './agenda';

function turno(datos: Partial<AppointmentResponse>): AppointmentResponse {
  return {
    id: 't',
    startDatetime: '2026-11-10T09:30:00',
    endDatetime: '2026-11-10T10:00:00',
    status: 'UNBOOKED',
    clientName: null,
    clientEmail: null,
    clientPhone: null,
    price: 12000,
    businessId: 'n-1',
    serviceId: 's-1',
    serviceName: 'Corte',
    employeeId: null,
    employeeName: null,
    createdAt: '2026-11-01T10:00:00',
    deposit: null,
    ...datos,
  };
}

describe('agenda', () => {
  it('claveDia y fechaDeClave van y vuelven en hora local', () => {
    expect(claveDia(new Date(2026, 10, 9))).toBe('2026-11-09');
    expect(claveDia(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(fechaDeClave('2026-11-09')).toEqual(new Date(2026, 10, 9));
  });

  it('fechaDeClave descarta lo que no es una fecha valida', () => {
    expect(fechaDeClave(null)).toBeNull();
    expect(fechaDeClave('cualquiera')).toBeNull();
    expect(fechaDeClave('2026-02-31')).toBeNull();
    expect(fechaDeClave('2026-11-9')).toBeNull();
  });

  it('sumarDias pasa de mes y de año', () => {
    expect(sumarDias(new Date(2026, 10, 30), 3)).toEqual(new Date(2026, 11, 3));
    expect(sumarDias(new Date(2026, 11, 31), 1)).toEqual(new Date(2027, 0, 1));
    expect(sumarDias(new Date(2026, 10, 9), -1)).toEqual(new Date(2026, 10, 8));
  });

  it('lunesDeSemana vuelve al lunes, tambien desde el domingo', () => {
    expect(lunesDeSemana(new Date(2026, 10, 12, 15, 30))).toEqual(new Date(2026, 10, 9));
    expect(lunesDeSemana(new Date(2026, 10, 9))).toEqual(new Date(2026, 10, 9));
    expect(lunesDeSemana(new Date(2026, 10, 15))).toEqual(new Date(2026, 10, 9));
    expect(lunesDeSemana(new Date(2026, 10, 1))).toEqual(new Date(2026, 9, 26));
  });

  it('diasDeLaSemana arma lunes a domingo y marca hoy', () => {
    const dias = diasDeLaSemana(new Date(2026, 10, 9), new Date(2026, 10, 13, 18, 0));
    expect(dias.map((d) => d.clave)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
    expect(dias.map((d) => d.corto)).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
    expect(dias.filter((d) => d.esHoy).map((d) => d.numero)).toEqual([4]);
  });

  it('rangoDeSemana nombra un mes o los dos si la semana cruza', () => {
    expect(rangoDeSemana(new Date(2026, 10, 9))).toBe('9 al 15 nov');
    expect(rangoDeSemana(new Date(2026, 9, 26))).toBe('26 oct al 1 nov');
  });

  it('horaDe corta la hora sin segundos', () => {
    expect(horaDe('2026-11-10T09:30:00')).toBe('09:30');
  });

  it('turnosDelDia filtra por fecha y ordena por hora', () => {
    const turnos = [
      turno({ id: 'b', startDatetime: '2026-11-10T11:00:00' }),
      turno({ id: 'otro-dia', startDatetime: '2026-11-11T09:00:00' }),
      turno({ id: 'a', startDatetime: '2026-11-10T09:00:00' }),
    ];
    expect(turnosDelDia(turnos, '2026-11-10').map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('diasConTurnos junta las fechas sin repetir', () => {
    const turnos = [
      turno({ startDatetime: '2026-11-10T09:00:00' }),
      turno({ startDatetime: '2026-11-10T11:00:00' }),
      turno({ startDatetime: '2026-11-12T09:00:00' }),
    ];
    expect([...diasConTurnos(turnos)]).toEqual(['2026-11-10', '2026-11-12']);
  });

  it('filtrarPorProfesional deja todos, los sin asignar o los de uno', () => {
    const turnos = [
      turno({ id: 'lucia', employeeId: 'e-1' }),
      turno({ id: 'tomas', employeeId: 'e-2' }),
      turno({ id: 'nadie', employeeId: null }),
    ];
    expect(filtrarPorProfesional(turnos, '').length).toBe(3);
    expect(filtrarPorProfesional(turnos, SIN_ASIGNAR).map((t) => t.id)).toEqual(['nadie']);
    expect(filtrarPorProfesional(turnos, 'e-1').map((t) => t.id)).toEqual(['lucia']);
  });

  it('resumenDelDia cuenta reservados y libres sin los cancelados', () => {
    const turnos = [
      turno({ status: 'BOOKED' }),
      turno({ status: 'AWAITING_PAYMENT' }),
      turno({ status: 'CANCELLED' }),
      turno({ status: 'SUSPENDED' }),
      turno({ status: 'UNBOOKED' }),
    ];
    expect(resumenDelDia(turnos)).toEqual({ reservados: 2, libres: 1 });
  });

  it('armarFilasDelDia pone cada turno en la franja donde arranca', () => {
    const turnos = [
      turno({ id: 'a', startDatetime: '2026-11-10T09:00:00' }),
      turno({ id: 'b', startDatetime: '2026-11-10T09:45:00' }),
      turno({ id: 'c', startDatetime: '2026-11-10T09:30:00', employeeId: 'e-1' }),
    ];
    const { filas, fueraDeHorario } = armarFilasDelDia(
      turnosDelDia(turnos, '2026-11-10'),
      '09:00:00',
      '11:00:00',
      30,
    );
    expect(filas.map((f) => f.hora)).toEqual(['09:00', '09:30', '10:00', '10:30']);
    expect(filas.map((f) => f.turnos.map((t) => t.id))).toEqual([['a'], ['c', 'b'], [], []]);
    expect(fueraDeHorario).toEqual([]);
  });

  it('armarFilasDelDia aparta los que quedan fuera del horario', () => {
    const turnos = [
      turno({ id: 'temprano', startDatetime: '2026-11-10T08:30:00' }),
      turno({ id: 'adentro', startDatetime: '2026-11-10T10:00:00' }),
      turno({ id: 'al-cierre', startDatetime: '2026-11-10T11:00:00' }),
    ];
    const { filas, fueraDeHorario } = armarFilasDelDia(turnos, '09:00', '11:00', 60);
    expect(filas.map((f) => f.turnos.map((t) => t.id))).toEqual([[], ['adentro']]);
    expect(fueraDeHorario.map((t) => t.id)).toEqual(['temprano', 'al-cierre']);
  });

  it('armarFilasDelDia no se cuelga con un intervalo en 0', () => {
    const { filas, fueraDeHorario } = armarFilasDelDia([turno({})], '09:00', '11:00', 0);
    expect(filas).toEqual([]);
    expect(fueraDeHorario.length).toBe(1);
  });

  it('filaDisponible mira si la franja termina despues de ahora', () => {
    const ahora = new Date(2026, 10, 10, 10, 12);
    expect(filaDisponible('2026-11-10', '10:00', 30, ahora)).toBe(true);
    expect(filaDisponible('2026-11-10', '09:30', 30, ahora)).toBe(false);
    expect(filaDisponible('2026-11-09', '18:00', 30, ahora)).toBe(false);
    expect(filaDisponible('2026-11-11', '09:00', 30, ahora)).toBe(true);
  });

  it('posicionDeAhora ubica la linea solo hoy y dentro del horario', () => {
    const ahora = new Date(2026, 10, 10, 10, 15);
    expect(posicionDeAhora('2026-11-10', '09:00', '18:00', 30, ahora)).toEqual({
      fila: 2,
      porcentaje: 50,
    });
    expect(posicionDeAhora('2026-11-11', '09:00', '18:00', 30, ahora)).toBeNull();
    expect(posicionDeAhora('2026-11-10', '11:00', '18:00', 30, ahora)).toBeNull();
    expect(posicionDeAhora('2026-11-10', '08:00', '10:15', 30, ahora)).toBeNull();
  });

  it('horasDeLaFila ofrece de a 5 minutos las que todavia no pasaron', () => {
    const ahora = new Date(2026, 10, 10, 10, 12);
    expect(horasDeLaFila('2026-11-10', '10:00', 30, ahora)).toEqual(['10:15', '10:20', '10:25']);
    expect(horasDeLaFila('2026-11-11', '10:00', 15, ahora)).toEqual(['10:00', '10:05', '10:10']);
    expect(horasDeLaFila('2026-11-09', '10:00', 15, ahora)).toEqual([]);
  });

  it('turnoQueChoca usa la misma regla que el back', () => {
    const existentes = [
      turno({
        id: 'lucia',
        startDatetime: '2026-11-10T10:00:00',
        endDatetime: '2026-11-10T10:45:00',
        employeeId: 'e-1',
      }),
      turno({
        id: 'cancelado',
        startDatetime: '2026-11-10T11:00:00',
        endDatetime: '2026-11-10T11:30:00',
        employeeId: 'e-1',
        status: 'CANCELLED',
      }),
      turno({
        id: 'nadie',
        startDatetime: '2026-11-10T12:00:00',
        endDatetime: '2026-11-10T12:30:00',
        employeeId: null,
      }),
    ];
    const nuevo = (desde: string, hasta: string, employeeId: string | null) => ({
      startDatetime: `2026-11-10T${desde}:00`,
      endDatetime: `2026-11-10T${hasta}:00`,
      employeeId,
    });
    expect(turnoQueChoca(nuevo('10:30', '11:00', 'e-1'), existentes)?.id).toBe('lucia');
    // termina justo cuando arranca el otro
    expect(turnoQueChoca(nuevo('10:45', '11:15', 'e-1'), existentes)).toBeNull();
    // otro profesional
    expect(turnoQueChoca(nuevo('10:00', '10:45', 'e-2'), existentes)).toBeNull();
    // sin profesional solo choca con otro sin profesional
    expect(turnoQueChoca(nuevo('10:00', '10:45', null), existentes)).toBeNull();
    expect(turnoQueChoca(nuevo('12:15', '12:45', null), existentes)?.id).toBe('nadie');
  });

  it('rangoDelTurno suma la duracion del servicio', () => {
    expect(rangoDelTurno('2026-11-10', '09:30', 45)).toEqual({
      startDatetime: '2026-11-10T09:30:00',
      endDatetime: '2026-11-10T10:15:00',
    });
  });

  it('alcanzaParaLaSemana para cuando el mas viejo es de antes del lunes', () => {
    const lunes = new Date(2026, 10, 9);
    const hasta = (fecha: string) => [
      turno({ startDatetime: '2026-11-20T10:00:00' }),
      turno({ startDatetime: `${fecha}T10:00:00` }),
    ];
    expect(alcanzaParaLaSemana(hasta('2026-11-09'), lunes, true)).toBe(false);
    expect(alcanzaParaLaSemana(hasta('2026-11-08'), lunes, true)).toBe(true);
    expect(alcanzaParaLaSemana(hasta('2026-11-12'), lunes, false)).toBe(true);
    expect(alcanzaParaLaSemana([], lunes, true)).toBe(false);
  });

  it('sumarSinRepetir saltea los que ya estaban', () => {
    const actuales = [turno({ id: 'a' }), turno({ id: 'b' })];
    const nuevos = [turno({ id: 'b' }), turno({ id: 'c' })];
    expect(sumarSinRepetir(actuales, nuevos).map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});
