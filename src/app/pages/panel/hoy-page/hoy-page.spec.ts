import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { BusinessStatsResponse } from '../../../core/models/estadisticas';
import { BusinessResponse } from '../../../core/models/negocio';
import { AppointmentResponse, AppointmentStatus, DepositStatus } from '../../../core/models/turno';
import { AppointmentService } from '../../../core/services/appointment-service';
import { EstadisticasService } from '../../../core/services/estadisticas-service';
import { NegocioService } from '../../../core/services/negocio-service';
import { HoyPage } from './hoy-page';

registerLocaleData(localeEsAr);

/** Fecha local sin zona, como las manda el back, a `minutos` de ahora. */
function aMinutos(minutos: number): string {
  const d = new Date(Date.now() + minutos * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

function turno(
  id: string,
  status: AppointmentStatus,
  desde: number,
  hasta: number,
  sena: DepositStatus | null = null,
): AppointmentResponse {
  return {
    id,
    status,
    startDatetime: aMinutos(desde),
    endDatetime: aMinutos(hasta),
    clientName: status === 'UNBOOKED' ? null : `Cliente ${id}`,
    clientEmail: status === 'UNBOOKED' ? null : `c${id}@mail.com`,
    clientPhone: null,
    price: 12500,
    businessId: 'n-1',
    serviceId: 's-1',
    serviceName: 'Corte',
    employeeId: null,
    employeeName: 'Tomás',
    createdAt: aMinutos(-600),
    deposit: sena ? { id: `d-${id}`, amount: 3750, status: sena, paidAt: null } : null,
  };
}

const STATS = {
  appointments: { cancelled: 1, cancellationRate: 4.1 },
  revenue: { depositsCollected: 46500, totalFromFinished: 25000 },
} as BusinessStatsResponse;

describe('HoyPage', () => {
  let fixture: ComponentFixture<HoyPage>;
  let api: {
    deHoy: ReturnType<typeof vi.fn<() => Observable<AppointmentResponse[]>>>;
    suspender: ReturnType<typeof vi.fn>;
  };
  let stats$: Observable<BusinessStatsResponse>;

  const DIA = () => [
    turno('1', 'BOOKED', -120, -75, 'PAID'), // terminado
    turno('2', 'BOOKED', -10, 20, 'PAID'), // en curso
    turno('3', 'AWAITING_PAYMENT', 30, 75, 'PENDING'),
    turno('4', 'UNBOOKED', 90, 135),
  ];

  async function crear(
    negocio$: Observable<BusinessResponse> = of({ id: 'n-1' } as BusinessResponse),
  ) {
    await TestBed.configureTestingModule({
      imports: [HoyPage],
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
        { provide: AppointmentService, useValue: api },
        { provide: EstadisticasService, useValue: { delNegocio: () => stats$ } },
        { provide: NegocioService, useValue: { miNegocio: () => negocio$ } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HoyPage);
    await fixture.whenStable();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const detalle = () => el().querySelector('aside')!.textContent ?? '';
  const boton = (texto: string) =>
    Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.includes(texto))!;

  beforeEach(() => {
    api = { deHoy: vi.fn(() => of(DIA())), suspender: vi.fn(() => of({})) };
    stats$ = of(STATS);
  });

  it('arma el título y el resumen con la lista y las estadísticas', async () => {
    await crear();
    const resumen = el().querySelector('section[aria-label="Resumen del día"]')!.textContent!;

    expect(el().querySelector('h1')?.textContent).toContain('Hoy, 4 turnos');
    expect(el().querySelector('h1')?.textContent).toContain('1 libre');
    // 3 tomados (2 reservados, contando el terminado, y 1 esperando seña) sobre 3 + 1 libre
    expect(resumen).toContain('75%');
    expect(resumen).toContain('$46.500');
    expect(resumen).toContain('2 de 3 pagadas');
    expect(resumen).toContain('$25.000');
    expect(resumen).toContain('4.1%');
  });

  it('destaca el turno en curso y lo muestra en el detalle', async () => {
    await crear();

    expect(el().textContent).toContain('quedan');
    expect(detalle()).toContain('Cliente 2');
    expect(detalle()).toContain('En curso');
    expect(detalle()).toContain('Suspender turno');
  });

  it('al elegir un turno esperando seña ofrece copiar el link de pago y no suspender', async () => {
    await crear();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    boton('Cliente 3').click();
    await fixture.whenStable();
    expect(detalle()).toContain('$3.750 pendiente');
    expect(detalle()).not.toContain('Suspender turno');

    el().querySelector('aside')!.querySelector('button')!.click();
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/reserva/3`);
    expect(detalle()).toContain('Link copiado');
  });

  it('un turno terminado no se puede suspender', async () => {
    await crear();
    boton('Cliente 1').click();
    await fixture.whenStable();

    expect(detalle()).toContain('Terminado');
    expect(detalle()).not.toContain('Suspender turno');
  });

  it('suspender pide confirmación y recarga el día', async () => {
    await crear();
    el().querySelector('aside')!.querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();

    expect(el().querySelector('[role="alertdialog"]')?.textContent).toContain('Cliente 2');
    api.deHoy.mockClear();
    Array.from(el().querySelectorAll('[role="alertdialog"] button'))
      .find((b) => b.textContent?.trim() === 'Suspender')!
      .dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(api.suspender).toHaveBeenCalledWith('2');
    expect(api.deHoy).toHaveBeenCalled();
    expect(el().querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('si fallan las estadísticas, el resto se muestra igual', async () => {
    stats$ = throwError(() => ({ status: 500, message: 'Error' }) as ApiError);
    await crear();

    expect(el().textContent).toContain('No se pudieron cargar las señas');
    expect(el().querySelector('section[aria-label="Resumen del día"]')?.textContent).toContain(
      '75%',
    );
    expect(el().querySelectorAll('section[aria-label="Turnos de hoy"] button').length).toBe(3);
  });

  it('sin turnos muestra el aviso de vacío', async () => {
    api.deHoy.mockReturnValue(of([]));
    await crear();

    expect(el().textContent).toContain('No hay turnos para hoy');
  });

  it('si falla la lista, deja reintentar', async () => {
    api.deHoy.mockReturnValue(
      throwError(() => ({ status: 0, message: 'Sin conexión' }) as ApiError),
    );
    await crear();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Sin conexión');

    api.deHoy.mockReturnValue(of(DIA()));
    boton('Reintentar').click();
    await fixture.whenStable();
    expect(el().textContent).toContain('Cliente 2');
  });

  it('si el dueño no tiene negocio, avisa en vez de pedir turnos', async () => {
    await crear(throwError(() => ({ status: 404, message: 'Negocio no encontrado' }) as ApiError));

    expect(el().textContent).toContain('Todavía no creaste tu negocio');
    expect(api.deHoy).not.toHaveBeenCalled();
  });
});
