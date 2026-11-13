import { senaDeLaReserva } from './reserva';
import { AppointmentResponse } from './turno';

const STATE = {
  turno: { id: 't-1', deposit: { id: 'd-1' } } as AppointmentResponse,
  negocio: { name: 'Estudio Malbec', slug: 'estudio-malbec' },
  reservadaEn: '2026-10-28T10:00:00',
  // lo agrega el router de Angular
  navigationId: 2,
};

describe('senaDeLaReserva', () => {
  it('devuelve el id de la seña si el state es de ese turno', () => {
    expect(senaDeLaReserva(STATE, 't-1')).toBe('d-1');
  });

  it('null si el state es de otro turno, está vacío o no trae seña', () => {
    expect(senaDeLaReserva(STATE, 't-2')).toBeNull();
    expect(senaDeLaReserva(null, 't-1')).toBeNull();
    expect(senaDeLaReserva({ navigationId: 1 }, 't-1')).toBeNull();
    expect(senaDeLaReserva({ turno: { id: 't-1', deposit: null } }, 't-1')).toBeNull();
    // un state armado a mano con cualquier cosa en la seña
    expect(senaDeLaReserva({ turno: { id: 't-1', deposit: { id: 42 } } }, 't-1')).toBeNull();
  });
});
