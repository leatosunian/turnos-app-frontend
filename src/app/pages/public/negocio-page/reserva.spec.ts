import { AppointmentResponse } from '../../../core/models/turno';
import {
  agruparPorDia,
  claveDeFecha,
  mesDeClave,
  montoSena,
  nombreRubro,
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

  it('montoSena usa 30 % si el porcentaje del servicio no es válido, como el back', () => {
    expect(montoSena(12500, { depositPorcentage: 30 })).toBe(3750);
    expect(montoSena(10000, { depositPorcentage: 0 })).toBe(3000);
    expect(montoSena(10000, { depositPorcentage: 50 })).toBe(5000);
  });

  it('nombreRubro pone tildes a los conocidos y capitaliza el resto', () => {
    expect(nombreRubro({ id: '1', name: 'PELUQUERIA', deleted: false })).toBe('Peluquería');
    expect(nombreRubro({ id: '2', name: 'GYM', deleted: false })).toBe('Gym');
  });
});
