import { AppointmentResponse, AppointmentStatus, DepositStatus } from '../../../core/models/turno';
import {
  duracionMinutos,
  minutosRestantes,
  porcentajeSena,
  resumirHoy,
  turnoEnCurso,
  turnoInicial,
} from './resumen-hoy';

function turno(
  id: string,
  status: AppointmentStatus,
  inicio: string,
  fin: string,
  sena: DepositStatus | null = null,
): AppointmentResponse {
  return {
    id,
    status,
    startDatetime: `2026-10-28T${inicio}:00`,
    endDatetime: `2026-10-28T${fin}:00`,
    clientName: status === 'UNBOOKED' ? null : `Cliente ${id}`,
    clientEmail: null,
    clientPhone: null,
    price: 12500,
    businessId: 'n-1',
    serviceId: 's-1',
    serviceName: 'Corte',
    employeeId: null,
    employeeName: null,
    createdAt: '2026-10-01T10:00:00',
    deposit: sena ? { id: `d-${id}`, amount: 3750, status: sena, paidAt: null } : null,
  };
}

const AHORA = new Date(2026, 9, 28, 10, 42);
const DIA = [
  turno('1', 'BOOKED', '09:30', '10:15', 'PAID'), // terminado
  turno('2', 'BOOKED', '10:15', '10:45', 'PAID'), // en curso
  turno('3', 'BOOKED', '11:00', '12:30', 'PAID'),
  turno('4', 'AWAITING_PAYMENT', '12:30', '13:15', 'PENDING'),
  turno('5', 'UNBOOKED', '13:15', '14:00'),
  turno('6', 'CANCELLED', '14:15', '15:00', 'REFUNDED'),
];

describe('resumirHoy', () => {
  it('cuenta tomados y libres, y calcula la ocupación sin cancelados', () => {
    expect(resumirHoy(DIA)).toEqual({
      ofrecidos: 5,
      libres: 1,
      tomados: 4,
      ocupacion: 80,
      conSena: 4,
      senasPagadas: 3,
    });
  });

  it('sin turnos no hay ocupación', () => {
    expect(resumirHoy([]).ocupacion).toBeNull();
  });
});

describe('turno en curso e inicial', () => {
  it('encuentra el que está pasando y cuánto le falta', () => {
    const actual = turnoEnCurso(DIA, AHORA);
    expect(actual?.id).toBe('2');
    expect(minutosRestantes(actual!, AHORA)).toBe(3);
  });

  it('elige el en curso; si no hay, el próximo con cliente; si no, el primero', () => {
    expect(turnoInicial(DIA, AHORA)?.id).toBe('2');
    expect(turnoInicial(DIA, new Date(2026, 9, 28, 10, 50))?.id).toBe('3');
    expect(turnoInicial(DIA, new Date(2026, 9, 28, 20, 0))?.id).toBe('1');
    expect(turnoInicial([DIA[4]], AHORA)).toBeNull();
  });
});

describe('duración y seña', () => {
  it('calcula la duración y el porcentaje de seña', () => {
    expect(duracionMinutos(DIA[2])).toBe(90);
    expect(porcentajeSena(DIA[2])).toBe(30);
    expect(porcentajeSena(DIA[4])).toBeNull();
  });
});
