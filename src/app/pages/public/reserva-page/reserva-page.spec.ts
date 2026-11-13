import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { AppointmentResponse } from '../../../core/models/turno';
import { AppointmentService } from '../../../core/services/appointment-service';
import { AuthService } from '../../../core/services/auth-service';
import { ReservaPage } from './reserva-page';

registerLocaleData(localeEsAr);

/** Fecha local sin zona, como las manda el back (2026-11-13T18:30:00). */
function sinZona(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return (
    `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}` +
    `T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`
  );
}

function turno(extra: Partial<AppointmentResponse> = {}): AppointmentResponse {
  return {
    id: 't-1',
    status: 'AWAITING_PAYMENT',
    startDatetime: '2099-10-29T11:00:00',
    endDatetime: '2099-10-29T11:45:00',
    // el GET público no trae los datos del cliente
    clientName: null,
    clientEmail: null,
    clientPhone: null,
    price: 12500,
    businessId: 'n-1',
    businessName: 'Estudio Malbec',
    businessSlug: 'estudio-malbec',
    serviceId: 's-1',
    serviceName: 'Corte + barba',
    employeeId: null,
    employeeName: 'Tomás',
    createdAt: '2099-10-01T10:00:00',
    deposit: { id: 'd-1', amount: 3750, status: 'PENDING', paidAt: null },
    // reservado hace 5 min: quedan 25 de los 30
    expiresAt: sinZona(new Date(Date.now() + 25 * 60_000)),
    ...extra,
  };
}

const pagado = (extra: Partial<AppointmentResponse> = {}) =>
  turno({
    status: 'BOOKED',
    expiresAt: null,
    deposit: { id: 'd-1', amount: 3750, status: 'PAID', paidAt: '2099-10-01T10:05:00' },
    ...extra,
  });

describe('ReservaPage', () => {
  let fixture: ComponentFixture<ReservaPage>;
  let porId: ReturnType<typeof vi.fn<(id: string) => Observable<AppointmentResponse>>>;
  let pagarSena: ReturnType<typeof vi.fn<(id: string) => Observable<AppointmentResponse>>>;
  let navegar: ReturnType<typeof vi.fn>;

  async function crear(
    delBack: Observable<AppointmentResponse> = of(turno()),
    { state = null as unknown, esCliente = false } = {},
  ) {
    history.replaceState(state, '');
    porId = vi.fn(() => delBack);
    pagarSena = vi.fn(() => of(pagado()));
    await TestBed.configureTestingModule({
      imports: [ReservaPage],
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
        { provide: AppointmentService, useValue: { porId, pagarSena } },
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
  const texto = () => el().textContent!.replace(/\s+/g, ' ');
  const h1 = () => el().querySelector('h1')?.textContent?.trim();
  const botonPagar = () =>
    Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.includes('Pagar'));

  afterEach(() => history.replaceState(null, ''));

  it('pide el turno al back y muestra los datos, los montos y la política', async () => {
    await crear();

    expect(porId).toHaveBeenCalledWith('t-1');
    expect(texto()).toContain('Estudio Malbec');
    expect(texto()).toContain('11:00');
    expect(texto()).toContain('Corte + barba');
    expect(texto()).toContain('Tomás');
    expect(texto()).toContain('$12.500');
    expect(texto()).toContain('$8.750');
    expect(texto()).toContain('Cancelás 24 h antes o más');
    expect(botonPagar()!.textContent).toContain('Pagar $3.750');
    // expiresAt se arma con la hora real (ahora mas 25 minutos) y el contador la compara con la
    // hora del momento en que se dibuja. Con toda la suite corriendo a veces pasa un segundo entre
    // una cosa y la otra y el contador ya muestra 24:59, asi que se aceptan los dos
    expect(el().querySelector('[role="timer"]')?.textContent?.trim()).toMatch(/^(25:00|24:5\d)$/);
  });

  it('no usa los montos que lleguen al navegar: muestra los del back', async () => {
    const trucho = { turno: { ...turno(), price: 1, deposit: { id: 'd-1', amount: 0 } } };
    await crear(of(turno()), { state: trucho });

    expect(botonPagar()!.textContent).toContain('Pagar $3.750');
    expect(texto()).not.toContain('$1 ');
  });

  it('las iniciales del negocio usan solo letras', async () => {
    await crear(of(turno({ businessName: 'Estudio <b>raro</b>' })));

    const iniciales = el().querySelector('span[aria-hidden="true"].font-bold')?.textContent;
    expect(iniciales?.trim()).toBe('EB');
  });

  it('un cliente logueado, al pagar, va a Mis turnos', async () => {
    await crear(of(turno()), { esCliente: true });
    botonPagar()!.click();
    await fixture.whenStable();

    expect(pagarSena).toHaveBeenCalledWith('t-1');
    expect(navegar).toHaveBeenCalledWith('/mis-turnos');
  });

  it('sin sesión, al pagar muestra la confirmación con lo que respondió el back', async () => {
    await crear();
    pagarSena.mockReturnValue(
      of(pagado({ deposit: { id: 'd-1', amount: 4000, status: 'PAID', paidAt: null } })),
    );
    botonPagar()!.click();
    await fixture.whenStable();

    expect(navegar).not.toHaveBeenCalled();
    expect(h1()).toBe('Tu turno quedó confirmado');
    expect(texto()).toContain('Pagaste la seña de $4.000');
    expect(texto()).toContain('Estudio Malbec te espera');
    expect(texto()).toContain('Volver a Estudio Malbec');
  });

  it('si el turno ya está confirmado, muestra la confirmación y no deja pagar', async () => {
    await crear(of(pagado()));

    expect(h1()).toBe('Tu turno quedó confirmado');
    expect(botonPagar()).toBeUndefined();
  });

  it('con seña del 0 % el turno llega confirmado: no habla de pagar', async () => {
    await crear(of(pagado({ deposit: { id: 'd-1', amount: 0, status: 'PAID', paidAt: null } })), {
      esCliente: true,
    });

    expect(h1()).toBe('Tu turno quedó confirmado');
    expect(texto()).toContain('Este servicio no pide seña');
    expect(texto()).not.toContain('Pagaste');
    expect(texto()).toContain('Ver mis turnos');
  });

  it('si el pago falla porque la reserva venció, vuelve a pedir el turno y lo avisa', async () => {
    await crear();
    pagarSena.mockReturnValue(
      throwError(
        () =>
          ({
            status: 400,
            message: 'Error al confirmar el pago: el turno no está esperando un pago.',
          }) as ApiError,
      ),
    );
    porId.mockReturnValue(of(turno({ status: 'UNBOOKED', deposit: null, expiresAt: null })));
    botonPagar()!.click();
    await fixture.whenStable();

    expect(porId).toHaveBeenCalledTimes(2);
    expect(h1()).toBe('Esta reserva ya no está activa');
    expect(texto()).toContain('Se venció el tiempo para pagar');
    expect(texto()).toContain('Reservar de nuevo en Estudio Malbec');
  });

  it('si ya se pagó desde otra pestaña, al tocar Pagar muestra la confirmación', async () => {
    await crear();
    pagarSena.mockReturnValue(
      throwError(
        () => ({ status: 400, message: 'el turno no está esperando un pago' }) as ApiError,
      ),
    );
    porId.mockReturnValue(of(pagado()));
    botonPagar()!.click();
    await fixture.whenStable();

    expect(h1()).toBe('Tu turno quedó confirmado');
    expect(texto()).toContain('Pagaste la seña de $3.750');
  });

  it('si el pago falla por otra cosa, muestra el error y deja reintentar', async () => {
    await crear();
    pagarSena.mockReturnValue(
      throwError(() => ({ status: 0, message: 'Sin conexión' }) as ApiError),
    );
    botonPagar()!.click();
    await fixture.whenStable();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Sin conexión');
    expect(botonPagar()!.disabled).toBe(false);
    expect(porId).toHaveBeenCalledTimes(1);
  });

  it('cuando llega expiresAt, no deja pagar', async () => {
    await crear(of(turno({ expiresAt: sinZona(new Date(Date.now() - 60_000)) })));

    expect(texto()).toContain('Se venció el tiempo para pagar');
    expect(botonPagar()!.disabled).toBe(true);
  });

  it('si el horario lo volvió a reservar otra persona, no le muestra esa reserva', async () => {
    const mia = {
      turno: turno({ deposit: { id: 'd-viejo', amount: 3750, status: 'PENDING', paidAt: null } }),
    };
    await crear(of(pagado()), { state: mia });

    expect(h1()).toBe('Esta reserva ya no está activa');
    expect(botonPagar()).toBeUndefined();
  });

  it('avisa si la reserva se canceló o la suspendió el negocio', async () => {
    await crear(of(turno({ status: 'SUSPENDED', expiresAt: null })));

    expect(h1()).toBe('Esta reserva ya no está activa');
    expect(texto()).toContain('El negocio suspendió este turno');
  });

  it('si el turno no existe, muestra la página de no encontrado', async () => {
    await crear(throwError(() => ({ status: 404, message: 'Turno no encontrado' }) as ApiError));

    expect(el().querySelector('app-no-encontrado-page')).not.toBeNull();
    expect(botonPagar()).toBeUndefined();
  });

  it('si no se puede traer el turno, deja reintentar', async () => {
    await crear(throwError(() => ({ status: 0, message: 'Sin conexión' }) as ApiError));
    expect(h1()).toBe('No pudimos traer tu reserva');

    porId.mockReturnValue(of(turno()));
    (el().querySelector('button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(botonPagar()!.textContent).toContain('Pagar $3.750');
  });
});
