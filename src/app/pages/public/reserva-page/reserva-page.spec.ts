import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { ReservaEnCurso } from '../../../core/models/reserva';
import { AppointmentResponse } from '../../../core/models/turno';
import { AppointmentService } from '../../../core/services/appointment-service';
import { AuthService } from '../../../core/services/auth-service';
import { ReservaPage } from './reserva-page';

registerLocaleData(localeEsAr);

function reserva(reservadaHaceMin = 5): ReservaEnCurso {
  return {
    turno: {
      id: 't-1',
      status: 'AWAITING_PAYMENT',
      startDatetime: '2099-10-29T11:00:00',
      endDatetime: '2099-10-29T11:45:00',
      clientName: 'Federico Paz',
      clientEmail: 'fede@mail.com',
      clientPhone: null,
      price: 12500,
      businessId: 'n-1',
      serviceId: 's-1',
      serviceName: 'Corte + barba',
      employeeId: null,
      employeeName: 'Tomás',
      createdAt: '2099-10-01T10:00:00',
      deposit: { id: 'd-1', amount: 3750, status: 'PENDING', paidAt: null },
    } as AppointmentResponse,
    negocio: { name: 'Estudio Malbec', slug: 'estudio-malbec' },
    reservadaEn: new Date(Date.now() - reservadaHaceMin * 60_000).toISOString(),
  };
}

describe('ReservaPage', () => {
  let fixture: ComponentFixture<ReservaPage>;
  let pagarSena: ReturnType<typeof vi.fn>;
  let navegar: ReturnType<typeof vi.fn>;

  async function crear(state: unknown, esCliente = false) {
    history.replaceState(state, '');
    pagarSena = vi.fn(() => of(reserva().turno));
    await TestBed.configureTestingModule({
      imports: [ReservaPage],
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
        { provide: AppointmentService, useValue: { pagarSena } },
        { provide: AuthService, useValue: { tieneRol: () => esCliente } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 't-1' }) } },
        },
      ],
    }).compileComponents();
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(ReservaPage);
    await fixture.whenStable();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const botonPagar = () =>
    Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.includes('Pagar'))!;

  afterEach(() => history.replaceState(null, ''));

  it('muestra el turno, los montos y la política antes de pagar', async () => {
    await crear(reserva());
    const texto = el().textContent!;

    expect(texto).toContain('Estudio Malbec');
    expect(texto).toContain('11:00');
    expect(texto).toContain('Corte + barba');
    expect(texto).toContain('Tomás');
    expect(texto).toContain('$12.500');
    expect(texto).toContain('$8.750');
    expect(texto).toContain('Cancelás 24 h antes o más');
    expect(botonPagar().textContent).toContain('Pagar $3.750');
    // reservado hace 5 min: quedan 25 de los 30
    expect(el().querySelector('[role="timer"]')?.textContent?.trim()).toBe('25:00');
  });

  it('un cliente logueado, al pagar, va a Mis turnos', async () => {
    await crear(reserva(), true);
    botonPagar().click();
    await fixture.whenStable();

    expect(pagarSena).toHaveBeenCalledWith('t-1');
    expect(navegar).toHaveBeenCalledWith('/mis-turnos');
  });

  it('sin sesión, al pagar se queda con la confirmación del turno', async () => {
    await crear(reserva());
    botonPagar().click();
    await fixture.whenStable();

    expect(navegar).not.toHaveBeenCalled();
    expect(el().querySelector('h1')?.textContent).toContain('Tu turno quedó confirmado');
    expect(el().textContent).toContain('Estudio Malbec te espera');
    expect(el().textContent).toContain('Volver a Estudio Malbec');
  });

  it('al pagar guarda el turno pago en el state, asi sobrevive a una recarga', async () => {
    await crear(reserva());
    const pago = { ...reserva().turno, status: 'BOOKED' } as AppointmentResponse;
    pagarSena.mockReturnValue(of(pago));
    botonPagar().click();
    await fixture.whenStable();

    expect(history.state.turno.status).toBe('BOOKED');
    expect(history.state.negocio.slug).toBe('estudio-malbec');
  });

  it('si se recarga despues de pagar, muestra la confirmacion y no deja pagar de nuevo', async () => {
    const recargada = reserva();
    recargada.turno = { ...recargada.turno, status: 'BOOKED' };
    await crear(recargada);

    expect(el().querySelector('h1')?.textContent).toContain('Tu turno quedó confirmado');
    expect(botonPagar()).toBeUndefined();
    expect(pagarSena).not.toHaveBeenCalled();
  });

  it('si el pago falla, muestra el error y deja reintentar', async () => {
    await crear(reserva());
    pagarSena.mockReturnValue(
      throwError(() => ({ status: 400, message: 'La reserva ya no está pendiente' }) as ApiError),
    );
    botonPagar().click();
    await fixture.whenStable();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain('ya no está pendiente');
    expect(botonPagar().disabled).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('si pasaron los 30 minutos, no deja pagar', async () => {
    await crear(reserva(31));

    expect(el().textContent).toContain('Se venció el tiempo para pagar');
    expect(botonPagar().disabled).toBe(true);
  });

  it('entrando por link, sin datos, avisa y deja pagar igual', async () => {
    await crear(null);

    expect(el().textContent).toContain('No tenemos los datos de esta reserva');
    expect(botonPagar().textContent).toContain('Pagar la seña');
    botonPagar().click();
    expect(pagarSena).toHaveBeenCalledWith('t-1');
  });
});
