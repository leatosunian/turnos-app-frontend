import { AppointmentScheduleResponse, DayScheduleResponse } from '../../../core/models/horario';
import {
  aHora,
  aMinutos,
  armarGrilla,
  armarLote,
  errorDeTurno,
  horariosDelRango,
  opcionesDeHora,
  ordenarSemana,
  PedidoLote,
  proximaRenovacion,
  seSuperponen,
  tonoDeProfesional,
  turnosPorSemana,
} from './horarios';

function turno(datos: Partial<AppointmentScheduleResponse>): AppointmentScheduleResponse {
  return {
    id: 't',
    dayNumber: 0,
    startTime: '10:00:00',
    endTime: '10:45:00',
    price: 12000,
    businessId: 'n-1',
    serviceId: 's-1',
    employeeId: null,
    ...datos,
  };
}

function dia(datos: Partial<DayScheduleResponse>): DayScheduleResponse {
  return {
    id: 'd',
    day: 'LUN',
    dayStart: '10:00:00',
    dayEnd: '20:00:00',
    appointmentDuration: 45,
    enabled: true,
    businessId: 'n-1',
    ...datos,
  };
}

describe('horarios', () => {
  it('aMinutos y aHora van y vuelven, con o sin segundos', () => {
    expect(aMinutos('10:45')).toBe(645);
    expect(aMinutos('10:45:00')).toBe(645);
    expect(aHora(645)).toBe('10:45');
    expect(aHora(5)).toBe('00:05');
  });

  it('ordenarSemana deja los dias de lunes a domingo', () => {
    const desordenados = [dia({ day: 'DOM' }), dia({ day: 'JUE' }), dia({ day: 'LUN' })];
    expect(ordenarSemana(desordenados).map((d) => d.day)).toEqual(['LUN', 'JUE', 'DOM']);
    // no toca la lista original
    expect(desordenados[0].day).toBe('DOM');
  });

  it('opcionesDeHora va de 00:00 a 23:45 cada 15', () => {
    const horas = opcionesDeHora();
    expect(horas.length).toBe(96);
    expect(horas[1]).toBe('00:15');
    expect(horas.at(-1)).toBe('23:45');
  });

  describe('armarGrilla', () => {
    it('arma una fila por intervalo y ubica cada turno en su franja', () => {
      const { filas, fueraDeHorario } = armarGrilla(
        [
          turno({ id: 'b', startTime: '11:00:00' }),
          turno({ id: 'a', startTime: '10:00:00' }),
          turno({ id: 'c', startTime: '10:00:00', employeeId: 'e-1' }),
        ],
        '10:00',
        '12:00',
        45,
      );
      expect(filas.map((f) => f.hora)).toEqual(['10:00', '10:45', '11:30']);
      expect(filas[0].turnos.map((t) => t.id)).toEqual(['a', 'c']);
      // el de las 11:00 cae en la franja de las 10:45
      expect(filas[1].turnos.map((t) => t.id)).toEqual(['b']);
      expect(fueraDeHorario).toEqual([]);
    });

    it('separa los que quedan antes del inicio o desde el fin', () => {
      const { filas, fueraDeHorario } = armarGrilla(
        [
          turno({ id: 'temprano', startTime: '08:00:00' }),
          turno({ id: 'justo-al-fin', startTime: '12:00:00' }),
        ],
        '10:00',
        '12:00',
        60,
      );
      expect(filas.every((f) => f.turnos.length === 0)).toBe(true);
      expect(fueraDeHorario.map((t) => t.id)).toEqual(['temprano', 'justo-al-fin']);
    });
  });

  it('tonoDeProfesional reparte los colores en orden y repite despues del cuarto', () => {
    const equipo = ['e-1', 'e-2', 'e-3', 'e-4', 'e-5'];
    expect(tonoDeProfesional('e-1', equipo)).toBe('ambar');
    expect(tonoDeProfesional('e-2', equipo)).toBe('menta');
    expect(tonoDeProfesional('e-5', equipo)).toBe('ambar');
    expect(tonoDeProfesional(null, equipo)).toBe('neutro');
    expect(tonoDeProfesional('e-borrado', equipo)).toBe('neutro');
  });

  describe('seSuperponen', () => {
    const base = { dayNumber: 0, startTime: '10:00', endTime: '10:45', employeeId: 'e-1' };

    it('choca si se pisan el mismo dia con el mismo profesional', () => {
      expect(seSuperponen(base, { ...base, startTime: '10:30', endTime: '11:15' })).toBe(true);
    });

    it('no choca si uno termina justo cuando arranca el otro', () => {
      expect(seSuperponen(base, { ...base, startTime: '10:45', endTime: '11:30' })).toBe(false);
    });

    it('no choca con otro profesional, otro dia o sin profesional', () => {
      expect(seSuperponen(base, { ...base, employeeId: 'e-2' })).toBe(false);
      expect(seSuperponen(base, { ...base, dayNumber: 1 })).toBe(false);
      expect(seSuperponen(base, { ...base, employeeId: null })).toBe(false);
    });

    it('dos sin profesional si chocan, aunque uno venga como undefined', () => {
      expect(seSuperponen({ ...base, employeeId: null }, { ...base, employeeId: undefined })).toBe(
        true,
      );
    });
  });

  describe('errorDeTurno', () => {
    const horario = { dayStart: '10:00:00', dayEnd: '20:00:00' };

    it('acepta un turno que entra en el horario', () => {
      expect(errorDeTurno('12:00', '12:45', 45, horario)).toBeNull();
    });

    it('rechaza el fin antes del inicio', () => {
      expect(errorDeTurno('12:00', '11:00', 45, horario)).toContain('después de la de inicio');
    });

    it('rechaza un rango que no alcanza para el servicio', () => {
      expect(errorDeTurno('12:00', '12:30', 45, horario)).toBe(
        'El servicio dura 45 min y no entra entre 12:00 y 12:30.',
      );
    });

    it('rechaza un turno fuera del horario del dia', () => {
      expect(errorDeTurno('19:30', '20:15', 45, horario)).toBe(
        'Queda fuera del horario del día (10:00 a 20:00).',
      );
    });
  });

  it('horariosDelRango solo deja los turnos que terminan antes del limite', () => {
    expect(horariosDelRango('10:00', '13:00', 45, 45)).toEqual([
      '10:00',
      '10:45',
      '11:30',
      '12:15',
    ]);
    expect(horariosDelRango('10:00', '10:30', 30, 45)).toEqual([]);
  });

  describe('armarLote', () => {
    const pedido: PedidoLote = {
      dias: [2, 0],
      desde: '10:00',
      hasta: '11:30',
      cada: 45,
      duracion: 45,
      serviceId: 's-1',
      employeeId: 'e-1',
    };

    it('arma un turno por horario en cada dia, de lunes a domingo', () => {
      const { aCrear, choques } = armarLote(pedido, []);
      expect(aCrear.map((t) => `${t.dayNumber} ${t.startTime}-${t.endTime}`)).toEqual([
        '0 10:00-10:45',
        '0 10:45-11:30',
        '2 10:00-10:45',
        '2 10:45-11:30',
      ]);
      expect(aCrear[0]).toEqual({
        dayNumber: 0,
        startTime: '10:00',
        endTime: '10:45',
        serviceId: 's-1',
        employeeId: 'e-1',
      });
      expect(choques).toEqual([]);
    });

    it('separa los que chocan con turnos que ya existen', () => {
      const existente = {
        dayNumber: 2,
        startTime: '10:30:00',
        endTime: '11:00:00',
        employeeId: 'e-1',
      };
      const { aCrear, choques } = armarLote(pedido, [existente]);
      expect(aCrear.length).toBe(2);
      expect(choques.map((t) => `${t.dayNumber} ${t.startTime}`)).toEqual(['2 10:00', '2 10:45']);
    });

    it('no deja que los del mismo lote se pisen entre ellos', () => {
      const { aCrear, choques } = armarLote({ ...pedido, dias: [0], cada: 30, hasta: '11:45' }, []);
      // cada 30 con un servicio de 45: el de 10:30 pisa al de 10:00, el de 11:00 entra
      expect(aCrear.map((t) => t.startTime)).toEqual(['10:00', '11:00']);
      expect(choques.map((t) => t.startTime)).toEqual(['10:30']);
    });
  });

  it('turnosPorSemana cuenta solo los turnos de los dias abiertos', () => {
    const semana = [dia({ day: 'LUN' }), dia({ day: 'MAR', enabled: false })];
    const plantilla = [turno({ dayNumber: 0 }), turno({ dayNumber: 0 }), turno({ dayNumber: 1 })];
    expect(turnosPorSemana(plantilla, semana)).toBe(2);
  });

  describe('proximaRenovacion', () => {
    const hoy = new Date(2026, 10, 11);

    it('es el ultimo dia cargado menos la anticipacion', () => {
      expect(proximaRenovacion('2026-12-10T00:00:00', 5, hoy)).toEqual(new Date(2026, 11, 5));
    });

    it('si esa fecha ya paso, renueva la proxima madrugada', () => {
      expect(proximaRenovacion('2026-11-13T00:00:00', 5, hoy)).toEqual(new Date(2026, 10, 12));
    });

    it('sin agenda cargada no hay renovacion', () => {
      expect(proximaRenovacion(null, 5, hoy)).toBeNull();
    });
  });
});
