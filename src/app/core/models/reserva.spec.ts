import { ReservaEnCurso, leerReserva } from './reserva';
import { AppointmentResponse } from './turno';

const RESERVA: ReservaEnCurso = {
  turno: { id: 't-1' } as AppointmentResponse,
  negocio: { name: 'Estudio Malbec', slug: 'estudio-malbec' },
  reservadaEn: '2026-10-28T10:00:00',
};

describe('leerReserva', () => {
  it('devuelve la reserva si es la del turno, sin lo que agrega el router', () => {
    expect(leerReserva({ ...RESERVA, navigationId: 2 }, 't-1')).toEqual(RESERVA);
  });

  it('ignora la de otro turno, un state vacío o incompleto', () => {
    expect(leerReserva(RESERVA, 't-2')).toBeNull();
    expect(leerReserva(null, 't-1')).toBeNull();
    expect(leerReserva({ navigationId: 1 }, 't-1')).toBeNull();
    // lo que mandaba TA-11 antes de sumar el negocio
    expect(leerReserva({ turno: { id: 't-1' } }, 't-1')).toBeNull();
  });
});
