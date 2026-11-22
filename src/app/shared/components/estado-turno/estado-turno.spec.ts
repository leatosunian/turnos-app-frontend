import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppointmentStatus } from '../../../core/models/turno';
import { EstadoTurno } from './estado-turno';

describe('EstadoTurno', () => {
  let fixture: ComponentFixture<EstadoTurno>;

  const ahora = new Date('2026-10-28T10:30:00-03:00');

  const mostrar = async (status: AppointmentStatus, inicio: string, fin: string) => {
    fixture.componentRef.setInput('turno', {
      status,
      startDatetime: `2026-10-28T${inicio}:00-03:00`,
      endDatetime: `2026-10-28T${fin}:00-03:00`,
    });
    fixture.componentRef.setInput('ahora', ahora);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).textContent?.trim();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EstadoTurno] }).compileComponents();
    fixture = TestBed.createComponent(EstadoTurno);
  });

  it('traduce los estados del back', async () => {
    expect(await mostrar('UNBOOKED', '12:00', '12:30')).toBe('Libre');
    expect(await mostrar('AWAITING_PAYMENT', '12:00', '12:30')).toBe('Esperando seña');
    expect(await mostrar('CANCELLED', '12:00', '12:30')).toBe('Cancelado');
    expect(await mostrar('SUSPENDED', '12:00', '12:30')).toBe('Suspendido');
  });

  it('un BOOKED cambia según la hora', async () => {
    expect(await mostrar('BOOKED', '12:00', '12:30')).toBe('Confirmado');
    expect(await mostrar('BOOKED', '10:00', '11:00')).toBe('En curso');
    expect(await mostrar('BOOKED', '09:00', '09:45')).toBe('Terminado');
  });

  it('a la hora exacta de inicio ya está en curso y a la de fin ya terminó', async () => {
    expect(await mostrar('BOOKED', '10:30', '11:00')).toBe('En curso');
    expect(await mostrar('BOOKED', '10:00', '10:30')).toBe('Terminado');
  });

  it('lleva un punto adelante que el lector de pantalla no lee', async () => {
    await mostrar('BOOKED', '12:00', '12:30');
    const punto = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(punto.getAttribute('aria-hidden')).toBe('true');
    expect(punto.classList).toContain('bg-success');
  });
});
