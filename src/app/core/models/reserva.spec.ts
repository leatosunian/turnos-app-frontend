import { CLAVE_RESERVA, ReservaEnCurso, leerReserva } from './reserva';
import { AppointmentResponse } from './turno';

const RESERVA: ReservaEnCurso = {
  turno: { id: 't-1' } as AppointmentResponse,
  negocio: { name: 'Estudio Malbec', slug: 'estudio-malbec' },
  reservadaEn: '2026-10-28T10:00:00',
};

describe('leerReserva', () => {
  it('devuelve la reserva si es la del turno', () => {
    expect(leerReserva({ [CLAVE_RESERVA]: RESERVA, navigationId: 2 }, 't-1')).toBe(RESERVA);
  });

  it('ignora la de otro turno, un state vacío o incompleto', () => {
    expect(leerReserva({ [CLAVE_RESERVA]: RESERVA }, 't-2')).toBeNull();
    expect(leerReserva(null, 't-1')).toBeNull();
    expect(leerReserva({ navigationId: 1 }, 't-1')).toBeNull();
    expect(leerReserva({ [CLAVE_RESERVA]: { turno: { id: 't-1' } } }, 't-1')).toBeNull();
  });
});
