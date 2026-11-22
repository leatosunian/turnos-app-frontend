import { AppointmentResponse } from '../../../core/models/turno';
import {
  agruparPorDia,
  claveDeFecha,
  horasEnTexto,
  mesDeClave,
  montoSena,
  porcentajeSena,
  nombreRubro,
  reservables,
  semanasDelMes,
  separarPorTurno,
} from './reserva';

function turno(id: string, inicio: string): AppointmentResponse {
  return { id, startDatetime: inicio } as AppointmentResponse;
}

describe('reserva', () => {
  it('claveDeFecha y mesDeClave usan la fecha local', () => {
    expect(claveDeFecha(new Date(2026, 10, 3))).toBe('2026-11-03');
    expect(mesDeClave('2026-11-29')).toEqual(new Date(2026, 10, 1));
  });

  it('agruparPorDia junta los turnos por fecha y los ordena por hora', () => {
    const dias = agruparPorDia([
      turno('b', '2026-11-12T15:00:00'),
      turno('c', '2026-11-13T09:00:00'),
      turno('a', '2026-11-12T09:30:00'),
    ]);

    expect([...dias.keys()]).toEqual(['2026-11-12', '2026-11-13']);
    expect(dias.get('2026-11-12')!.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('semanasDelMes arranca el lunes y marca los días con turnos libres', () => {
    // noviembre de 2026 empieza un domingo y tiene 30 días
    const semanas = semanasDelMes(new Date(2026, 10, 1), new Set(['2026-11-12']));

    expect(semanas.length).toBe(6);
    expect(semanas.every((semana) => semana.length === 7)).toBe(true);
    expect(semanas[0].slice(0, 6).every((dia) => dia.numero === null)).toBe(true);
    expect(semanas[0][6]).toEqual({ clave: '2026-11-01', numero: 1, libre: false });
    expect(semanas.flat().find((dia) => dia.numero === 12)?.libre).toBe(true);
    expect(semanas[5][0].numero).toBe(30);
  });

  it('separarPorTurno pasa a la tarde desde las 13', () => {
    const { manana, tarde } = separarPorTurno([
      turno('a', '2026-11-12T09:30:00'),
      turno('b', '2026-11-12T12:45:00'),
      turno('c', '2026-11-12T13:00:00'),
    ]);

    expect(manana.map((t) => t.id)).toEqual(['a', 'b']);
    expect(tarde.map((t) => t.id)).toEqual(['c']);
  });

  it('montoSena usa 30 % si el porcentaje del servicio falta o no es válido, como el back', () => {
    expect(montoSena(12500, { depositPorcentage: 30 })).toBe(3750);
    expect(montoSena(10000, { depositPorcentage: 50 })).toBe(5000);
    expect(montoSena(10000, { depositPorcentage: 150 })).toBe(3000);
    expect(montoSena(10000, { depositPorcentage: -5 })).toBe(3000);
    expect(montoSena(10000, { depositPorcentage: null as unknown as number })).toBe(3000);
  });

  it('el 0 % es sin seña, no el 30 % por defecto', () => {
    expect(porcentajeSena({ depositPorcentage: 0 })).toBe(0);
    expect(montoSena(10000, { depositPorcentage: 0 })).toBe(0);
  });

  it('nombreRubro pone tildes a los conocidos y capitaliza el resto', () => {
    expect(nombreRubro({ id: '1', name: 'PELUQUERIA', deleted: false })).toBe('Peluquería');
    expect(nombreRubro({ id: '2', name: 'SPA', deleted: false })).toBe('Spa');
  });

  it('nombreRubro traduce los rubros que el back trae en inglés', () => {
    expect(nombreRubro({ id: '1', name: 'GYM', deleted: false })).toBe('Gimnasio');
    expect(nombreRubro({ id: '2', name: 'TATTOO', deleted: false })).toBe('Tatuajes');
  });

  describe('reservables', () => {
    // el ejemplo del ticket: son las 15:00
    const A_LAS_15 = new Date(2026, 10, 21, 15, 0).getTime();
    const ids = (lista: AppointmentResponse[]) => lista.map((t) => t.id);
    const turnos = [
      turno('pasado', '2026-11-21T14:30:00'),
      turno('16', '2026-11-21T16:00:00'),
      turno('17', '2026-11-21T17:00:00'),
      turno('17-30', '2026-11-21T17:30:00'),
      turno('manana', '2026-11-22T10:00:00'),
    ];

    it('con 2 h, a las 15:00 el turno de las 16:00 ya no se puede reservar', () => {
      expect(ids(reservables(turnos, A_LAS_15, 2))).toEqual(['17-30', 'manana']);
    });

    it('un turno justo en el límite tampoco: el back pide que empiece después', () => {
      expect(ids(reservables(turnos, A_LAS_15, 2))).not.toContain('17');
    });

    it('con 24 h solo quedan los que empiezan después de mañana a esta misma hora', () => {
      expect(ids(reservables(turnos, A_LAS_15, 24))).toEqual([]);
      expect(ids(reservables(turnos, A_LAS_15 - 6 * 60 * 60 * 1000, 24))).toEqual(['manana']);
    });

    it('con 0 h es como antes: solo saca los que ya empezaron', () => {
      expect(ids(reservables(turnos, A_LAS_15, 0))).toEqual(['16', '17', '17-30', 'manana']);
    });
  });

  it('horasEnTexto usa singular para 1 hora', () => {
    expect(horasEnTexto(1)).toBe('1 hora');
    expect(horasEnTexto(12)).toBe('12 horas');
  });
});
