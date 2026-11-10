import { esProximo, limiteDevolucion, sePuedeCancelar, seDevuelveLaSena } from './turno-cliente';

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

  it('la seña vuelve con 24 h o más de anticipación, como en el back', () => {
    expect(limiteDevolucion({ startDatetime: '2025-10-29T11:00:00' })).toEqual(
      new Date(2025, 9, 28, 11, 0),
    );
    expect(seDevuelveLaSena({ startDatetime: '2025-10-29T10:00:00' }, AHORA)).toBe(true);
    expect(seDevuelveLaSena({ startDatetime: '2025-10-29T09:59:00' }, AHORA)).toBe(false);
  });
});
