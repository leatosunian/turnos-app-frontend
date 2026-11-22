import { AppointmentResponse, DepositResponse } from './turno';
import {
  esProximo,
  horasDePolitica,
  limiteDevolucion,
  sePuedeCancelar,
  seDevuelveLaSena,
  tieneSena,
} from './turno-cliente';

const AHORA = new Date(2025, 9, 28, 10, 0);

describe('turno-cliente', () => {
  const turno = (
    status: 'BOOKED' | 'AWAITING_PAYMENT' | 'CANCELLED',
    inicio: string,
    fin: string,
  ) => ({
    status,
    startDatetime: inicio,
    endDatetime: fin,
  });

  it('próximos son los reservados o sin pagar que no terminaron', () => {
    expect(esProximo(turno('BOOKED', '2025-10-28T09:30:00', '2025-10-28T10:15:00'), AHORA)).toBe(
      true,
    );
    expect(
      esProximo(turno('AWAITING_PAYMENT', '2025-10-29T10:00:00', '2025-10-29T11:00:00'), AHORA),
    ).toBe(true);
    expect(esProximo(turno('BOOKED', '2025-10-28T09:00:00', '2025-10-28T10:00:00'), AHORA)).toBe(
      false,
    );
    expect(esProximo(turno('CANCELLED', '2025-10-30T10:00:00', '2025-10-30T11:00:00'), AHORA)).toBe(
      false,
    );
  });

  it('se cancelan solo los confirmados que no empezaron', () => {
    expect(
      sePuedeCancelar(turno('BOOKED', '2025-10-28T10:30:00', '2025-10-28T11:00:00'), AHORA),
    ).toBe(true);
    expect(
      sePuedeCancelar(turno('BOOKED', '2025-10-28T09:30:00', '2025-10-28T10:30:00'), AHORA),
    ).toBe(false);
    expect(
      sePuedeCancelar(
        turno('AWAITING_PAYMENT', '2025-10-29T10:00:00', '2025-10-29T11:00:00'),
        AHORA,
      ),
    ).toBe(false);
  });

  // una seña con la política guardada al reservar
  const sena = (horas: number | null | undefined, amount = 3750): DepositResponse => ({
    id: 'd-1',
    amount,
    status: 'PAID',
    paidAt: null,
    cancellationNoticeHours: horas,
  });
  const conSena = (inicio: string, horas?: number | null) =>
    ({ startDatetime: inicio, deposit: sena(horas) }) as Pick<
      AppointmentResponse,
      'startDatetime' | 'deposit'
    >;

  it('usa las horas guardadas en la seña y, si no vienen, 24 h', () => {
    expect(horasDePolitica(conSena('2025-10-30T10:00:00', 48))).toBe(48);
    expect(horasDePolitica(conSena('2025-10-30T10:00:00', 96))).toBe(96);
    expect(horasDePolitica(conSena('2025-10-30T10:00:00', null))).toBe(24);
    expect(horasDePolitica({ deposit: null })).toBe(24);
  });

  it('la seña vuelve con 24 h o más de anticipación, como en el back', () => {
    expect(limiteDevolucion({ startDatetime: '2025-10-29T11:00:00', deposit: null })).toEqual(
      new Date(2025, 9, 28, 11, 0),
    );
    expect(seDevuelveLaSena(conSena('2025-10-29T10:00:00', 24), AHORA)).toBe(true);
    expect(seDevuelveLaSena(conSena('2025-10-29T09:59:00', 24), AHORA)).toBe(false);
  });

  it('con 48 h la cuenta cambia: justo 48 h antes todavía vuelve, un minuto menos ya no', () => {
    // ahora es el martes 28/10 a las 10:00
    expect(limiteDevolucion(conSena('2025-10-30T10:00:00', 48))).toEqual(
      new Date(2025, 9, 28, 10, 0),
    );
    expect(seDevuelveLaSena(conSena('2025-10-30T10:00:00', 48), AHORA)).toBe(true);
    expect(seDevuelveLaSena(conSena('2025-10-30T09:59:00', 48), AHORA)).toBe(false);
    // el mismo turno con 24 h sí devolvería
    expect(seDevuelveLaSena(conSena('2025-10-30T09:59:00', 24), AHORA)).toBe(true);
  });

  it('con 96 h hacen falta cuatro días', () => {
    expect(seDevuelveLaSena(conSena('2025-11-01T10:00:00', 96), AHORA)).toBe(true);
    expect(seDevuelveLaSena(conSena('2025-10-31T10:00:00', 96), AHORA)).toBe(false);
  });

  it('un turno sin seña o con seña de $0 no tiene seña que avisar', () => {
    expect(tieneSena({ deposit: sena(24) })).toBe(true);
    expect(tieneSena({ deposit: sena(24, 0) })).toBe(false);
    expect(tieneSena({ deposit: null })).toBe(false);
  });
});
