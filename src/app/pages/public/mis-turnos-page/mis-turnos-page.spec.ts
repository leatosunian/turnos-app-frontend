import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { AppointmentResponse, AppointmentStatus, DepositStatus } from '../../../core/models/turno';
import { AppointmentService } from '../../../core/services/appointment-service';
import { MisTurnosPage } from './mis-turnos-page';

registerLocaleData(localeEsAr);

// "ahora" de todos los tests: martes 28 de octubre de 2025, 10:00
const AHORA = new Date(2025, 9, 28, 10, 0);

function turno(
  id: string,
  status: AppointmentStatus,
  inicio: string,
  extra: Partial<AppointmentResponse> = {},
  sena: DepositStatus = 'PAID',
): AppointmentResponse {
  const fin = new Date(new Date(inicio).getTime() + 45 * 60 * 1000);
  return {
    id,
    status,
    startDatetime: inicio,
    endDatetime: `${inicio.slice(0, 11)}${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}:00`,
    clientName: 'Flor',
    clientEmail: null,
    clientPhone: null,
    price: 12500,
    businessId: 'n-1',
    serviceId: 's-1',
    serviceName: `Servicio ${id}`,
    employeeId: null,
    employeeName: 'Tomás',
    createdAt: '2025-10-01T00:00:00',
    deposit: { id: `d-${id}`, amount: 3750, status: sena, paidAt: null },
    ...extra,
  };
}

const MANIANA = turno('maniana', 'BOOKED', '2025-10-29T11:00:00', {
  businessName: 'Estudio Malbec',
});
const EN_UNA_SEMANA = turno('semana', 'BOOKED', '2025-11-04T18:30:00');
const SIN_PAGAR = turno('sin-pagar', 'AWAITING_PAYMENT', '2025-11-06T18:30:00', {}, 'PENDING');
const HOY_TARDE = turno('hoy', 'BOOKED', '2025-10-28T19:00:00');
const TERMINADO = turno('terminado', 'BOOKED', '2025-10-02T10:00:00');
const CANCELADO = turno('cancelado', 'CANCELLED', '2025-09-18T10:00:00', {}, 'REFUNDED');

describe('MisTurnosPage', () => {
  let fixture: ComponentFixture<MisTurnosPage>;
  let servicio: {
    misTurnos: ReturnType<typeof vi.fn<() => Observable<AppointmentResponse[]>>>;
    cancelar: ReturnType<typeof vi.fn<(id: string) => Observable<AppointmentResponse>>>;
  };

  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => el().textContent?.replace(/\s+/g, ' ') ?? '';
  const articulos = () => [...el().querySelectorAll('article')] as HTMLElement[];
  const boton = (nombre: string, raiz: ParentNode = el()) =>
    [...raiz.querySelectorAll('button, a')].find((b) =>
      b.textContent?.replace(/\s+/g, ' ').includes(nombre),
    ) as HTMLElement | undefined;

  async function crear(turnos: AppointmentResponse[] | Observable<AppointmentResponse[]>) {
    servicio.misTurnos.mockReturnValue(Array.isArray(turnos) ? of(turnos) : turnos);
    fixture = TestBed.createComponent(MisTurnosPage);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function refrescar() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AHORA);
    servicio = { misTurnos: vi.fn(), cancelar: vi.fn() };
    TestBed.configureTestingModule({
      imports: [MisTurnosPage],
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
        { provide: AppointmentService, useValue: servicio },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('muestra los próximos del más cercano al más lejano y cuenta cuántos son', async () => {
    await crear([EN_UNA_SEMANA, CANCELADO, MANIANA, TERMINADO, SIN_PAGAR]);

    expect(articulos().map((a) => a.querySelector('.font-semibold')?.textContent?.trim())).toEqual([
      'Servicio maniana · Estudio Malbec',
      'Servicio semana',
      'Servicio sin-pagar',
    ]);
    expect(texto()).toContain('Próximos · 3');
    expect(articulos()[0].textContent).toContain('Mañana');
    expect(articulos()[0].textContent).toContain('11:00');
  });

  it('cada turno muestra estado, profesional, duración y seña pagada', async () => {
    await crear([MANIANA]);
    const tarjeta = articulos()[0].textContent!.replace(/\s+/g, ' ');

    expect(tarjeta).toContain('Confirmado');
    expect(tarjeta).toContain('Con Tomás · 45 min');
    expect(tarjeta).toContain('Seña pagada');
    expect(tarjeta).toContain('$3.750 de $12.500');
  });

  it('si falta la seña, ofrece pagarla en la pantalla de reserva', async () => {
    await crear([SIN_PAGAR]);
    const pagar = boton('Pagar seña')!;

    expect(pagar.textContent).toContain('$3.750');
    expect(pagar.getAttribute('href')).toBe('/reserva/sin-pagar');
    expect(boton('Cancelar turno')).toBeUndefined();
  });

  it('avisa hasta cuándo se devuelve la seña o que ya no se devuelve', async () => {
    await crear([MANIANA, HOY_TARDE]);
    const [hoy, maniana] = articulos().map((a) => a.textContent!.replace(/\s+/g, ' '));

    expect(hoy).toContain('Faltan menos de 24 h: si cancelás, la seña no se devuelve.');
    expect(maniana).toContain('Si cancelás hoy antes de las 11:00, te devolvemos la seña.');
  });

  it('cancelar pide confirmación y no hace nada si se vuelve atrás', async () => {
    await crear([MANIANA]);

    boton('Cancelar turno')!.click();
    await refrescar();
    const dialogo = el().querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialogo.textContent).toContain('te devolvemos la seña de $3.750');

    boton('Volver', dialogo)!.click();
    await refrescar();
    expect(el().querySelector('[role="alertdialog"]')).toBeNull();
    expect(servicio.cancelar).not.toHaveBeenCalled();
  });

  it('con menos de 24 h el diálogo avisa que la seña se pierde', async () => {
    await crear([HOY_TARDE]);

    boton('Cancelar turno')!.click();
    await refrescar();

    expect(el().querySelector('[role="alertdialog"]')!.textContent).toContain(
      'la seña de $3.750 no se devuelve',
    );
  });

  it('al confirmar cancela, pasa el turno al historial y avisa qué pasa con la seña', async () => {
    await crear([MANIANA]);
    servicio.cancelar.mockReturnValue(
      of({
        ...MANIANA,
        status: 'CANCELLED',
        deposit: { ...MANIANA.deposit!, status: 'REFUNDED' },
      }),
    );

    boton('Cancelar turno')!.click();
    await refrescar();
    boton('Cancelar turno', el().querySelector('[role="alertdialog"]')!)!.click();
    await refrescar();

    expect(servicio.cancelar).toHaveBeenCalledWith('maniana');
    expect(el().querySelector('[role="alertdialog"]')).toBeNull();
    expect(texto()).toContain('Cancelaste el turno. Te devolvemos la seña.');
    expect(texto()).toContain('Próximos · 0');
    expect(texto()).toContain('Seña devuelta');
  });

  it('si el back rechaza la cancelación, el diálogo queda abierto con el error', async () => {
    await crear([MANIANA]);
    servicio.cancelar.mockReturnValue(
      throwError(() => ({ status: 400, message: 'No se puede cancelar.' }) satisfies ApiError),
    );

    boton('Cancelar turno')!.click();
    await refrescar();
    boton('Cancelar turno', el().querySelector('[role="alertdialog"]')!)!.click();
    await refrescar();

    expect(el().querySelector('[role="alertdialog"]')!.textContent).toContain(
      'No se puede cancelar.',
    );
  });

  it('la pestaña Historial muestra los pasados, el más reciente primero', async () => {
    await crear([CANCELADO, MANIANA, TERMINADO]);

    boton('Historial')!.click();
    await refrescar();

    const filas = [...el().querySelectorAll('li')].map((li) =>
      li.textContent!.replace(/\s+/g, ' '),
    );
    expect(articulos()).toHaveLength(0);
    expect(filas).toHaveLength(2);
    expect(filas[0]).toContain('Servicio terminado');
    expect(filas[0]).toContain('Terminado');
    expect(filas[1]).toContain('Servicio cancelado');
    expect(filas[1]).toContain('Seña devuelta');
  });

  it('sin turnos muestra los avisos vacíos', async () => {
    await crear([]);
    expect(texto()).toContain('No tenés turnos próximos');

    boton('Historial')!.click();
    await refrescar();
    expect(texto()).toContain('Todavía no tenés turnos pasados');
  });

  it('si falla la carga deja reintentar', async () => {
    await crear(throwError(() => ({ status: 0, message: '' })));
    expect(texto()).toContain('No pudimos traer tus turnos');

    servicio.misTurnos.mockReturnValue(of([MANIANA]));
    boton('Reintentar')!.click();
    await refrescar();

    expect(articulos()).toHaveLength(1);
  });
});
