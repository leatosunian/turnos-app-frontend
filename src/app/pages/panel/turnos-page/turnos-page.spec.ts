import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { BusinessResponse } from '../../../core/models/negocio';
import { Pagina } from '../../../core/models/pagina';
import { AppointmentResponse, AppointmentStatus } from '../../../core/models/turno';
import { AppointmentService, FiltroTurnos } from '../../../core/services/appointment-service';
import { NegocioService } from '../../../core/services/negocio-service';
import { TurnosPage, agruparPorDia, numerosDePagina } from './turnos-page';

registerLocaleData(localeEsAr);

function turno(
  id: string,
  status: AppointmentStatus,
  // a futuro, para que los BOOKED estén confirmados y no terminados
  inicio = '2099-10-28T09:30:00',
): AppointmentResponse {
  return {
    id,
    status,
    startDatetime: inicio,
    endDatetime: inicio,
    clientName: status === 'UNBOOKED' ? null : `Cliente ${id}`,
    clientEmail: null,
    clientPhone: null,
    price: 7500,
    businessId: 'n-1',
    serviceId: 's-1',
    serviceName: 'Corte',
    employeeId: null,
    employeeName: 'Tomás',
    createdAt: inicio,
    deposit: status === 'BOOKED' ? { id: 'd', amount: 3750, status: 'PAID', paidAt: inicio } : null,
  };
}

function pagina(
  items: AppointmentResponse[],
  numero = 0,
  total = items.length,
): Pagina<AppointmentResponse> {
  return { items, numero, tamanio: 20, total, totalPaginas: Math.ceil(total / 20) };
}

describe('TurnosPage', () => {
  let fixture: ComponentFixture<TurnosPage>;
  let api: {
    listar: ReturnType<
      typeof vi.fn<(id: string, f?: FiltroTurnos) => Observable<Pagina<AppointmentResponse>>>
    >;
    contar: ReturnType<
      typeof vi.fn<(id: string, s?: AppointmentStatus | null) => Observable<number>>
    >;
    suspender: ReturnType<typeof vi.fn>;
    eliminar: ReturnType<typeof vi.fn>;
  };

  async function crear(
    negocio$: Observable<BusinessResponse> = of({ id: 'n-1' } as BusinessResponse),
  ) {
    await TestBed.configureTestingModule({
      imports: [TurnosPage],
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
        { provide: AppointmentService, useValue: api },
        { provide: NegocioService, useValue: { miNegocio: () => negocio$ } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TurnosPage);
    await fixture.whenStable();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const boton = (texto: string) =>
    Array.from(el().querySelectorAll('button')).find((b) =>
      b.textContent?.trim().startsWith(texto),
    )!;

  beforeEach(() => {
    api = {
      listar: vi.fn(() => of(pagina([turno('1', 'BOOKED'), turno('2', 'UNBOOKED')], 0, 45))),
      contar: vi.fn((_id, status) => of(status ? 4 : 45)),
      suspender: vi.fn(() => of(turno('1', 'SUSPENDED'))),
      eliminar: vi.fn(() => of(undefined)),
    };
  });

  it('carga la primera página y los contadores de cada filtro', async () => {
    await crear();

    expect(api.listar).toHaveBeenCalledWith('n-1', { status: null, page: 0, size: 20 });
    expect(api.contar).toHaveBeenCalledTimes(6);
    expect(el().querySelectorAll('tbody tr').length).toBe(2);
    expect(el().textContent).toContain('1–2 de 45');
    expect(boton('Esperando seña').textContent).toContain('4');
  });

  it('el filtro vuelve a la primera página con ese estado', async () => {
    await crear();
    boton('Cancelados').click();
    await fixture.whenStable();

    expect(api.listar).toHaveBeenLastCalledWith('n-1', { status: 'CANCELLED', page: 0, size: 20 });
    expect(boton('Cancelados').getAttribute('aria-pressed')).toBe('true');
  });

  it('"Cargar más" suma la página siguiente a la lista', async () => {
    await crear();
    api.listar.mockReturnValue(of(pagina([turno('3', 'CANCELLED')], 1, 45)));
    boton('Cargar más').click();
    await fixture.whenStable();

    expect(api.listar).toHaveBeenLastCalledWith('n-1', { status: null, page: 1, size: 20 });
    expect(el().textContent).toContain('3 de 45');
  });

  it('solo los reservados se pueden suspender y solo los libres eliminar', async () => {
    await crear();
    const menus = el().querySelectorAll<HTMLButtonElement>('tbody [aria-haspopup="menu"]');

    menus[0].click();
    await fixture.whenStable();
    expect(el().querySelector('[role="menu"]')?.textContent?.trim()).toBe('Suspender turno');

    menus[1].click();
    await fixture.whenStable();
    expect(el().querySelector('[role="menu"]')?.textContent?.trim()).toBe('Eliminar turno libre');
  });

  it('un reservado que ya terminó no se puede suspender', async () => {
    api.listar.mockReturnValue(of(pagina([turno('1', 'BOOKED', '2020-01-10T09:30:00')])));
    await crear();

    expect(el().querySelector('tbody')?.textContent).toContain('Terminado');
    expect(el().querySelector('tbody [aria-haspopup="menu"]')).toBeNull();
  });

  it('suspender pide confirmación, llama al back y recarga', async () => {
    await crear();
    el().querySelector<HTMLButtonElement>('tbody [aria-haspopup="menu"]')!.click();
    await fixture.whenStable();
    boton('Suspender turno').click();
    await fixture.whenStable();

    const dialogo = el().querySelector('[role="alertdialog"]')!;
    expect(dialogo.textContent).toContain('¿Suspender este turno?');
    expect(dialogo.textContent).toContain('$3.750');
    expect(api.suspender).not.toHaveBeenCalled();

    api.listar.mockClear();
    boton('Suspender').click();
    await fixture.whenStable();

    expect(api.suspender).toHaveBeenCalledWith('1');
    expect(api.listar).toHaveBeenCalled();
    expect(el().querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('si el back rechaza la acción, el diálogo queda abierto con el error', async () => {
    api.eliminar.mockReturnValue(
      throwError(() => ({ status: 400, message: 'No se puede eliminar' }) as ApiError),
    );
    await crear();
    el().querySelectorAll<HTMLButtonElement>('tbody [aria-haspopup="menu"]')[1].click();
    await fixture.whenStable();
    boton('Eliminar turno libre').click();
    await fixture.whenStable();
    boton('Eliminar').click();
    await fixture.whenStable();

    expect(el().querySelector('[role="alertdialog"]')?.textContent).toContain(
      'No se puede eliminar',
    );
  });

  it('muestra el aviso de vacío y el de error con reintentar', async () => {
    api.listar.mockReturnValue(of(pagina([])));
    await crear();
    expect(el().textContent).toContain('Todavía no hay turnos');

    api.listar.mockReturnValue(
      throwError(() => ({ status: 0, message: 'Sin conexión' }) as ApiError),
    );
    boton('Libres').click();
    await fixture.whenStable();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Sin conexión');
  });

  it('si el dueño no tiene negocio, avisa en vez de pedir turnos', async () => {
    await crear(throwError(() => ({ status: 404, message: 'Negocio no encontrado' }) as ApiError));

    expect(el().textContent).toContain('Todavía no creaste tu negocio');
    expect(api.listar).not.toHaveBeenCalled();
  });
});

describe('numerosDePagina', () => {
  it('muestra todas si son pocas y recorta con "…" si son muchas', () => {
    expect(numerosDePagina(0, 3)).toEqual([0, 1, 2]);
    expect(numerosDePagina(0, 19)).toEqual([0, 1, null, 18]);
    expect(numerosDePagina(9, 19)).toEqual([0, null, 8, 9, 10, null, 18]);
  });
});

describe('agruparPorDia', () => {
  it('agrupa por día y marca hoy, mañana y ayer', () => {
    const grupos = agruparPorDia(
      [
        turno('1', 'BOOKED', '2026-10-29T10:00:00'),
        turno('2', 'BOOKED', '2026-10-28T11:00:00'),
        turno('3', 'BOOKED', '2026-10-28T09:00:00'),
        turno('4', 'BOOKED', '2026-10-20T09:00:00'),
      ],
      new Date(2026, 9, 28, 12),
    );

    expect(grupos.map((g) => [g.clave, g.relativo, g.turnos.length])).toEqual([
      ['2026-10-29', 'Mañana', 1],
      ['2026-10-28', 'Hoy', 2],
      ['2026-10-20', null, 1],
    ]);
  });
});
