import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { errorInterceptor } from '../../../core/interceptors/error-interceptor';
import { BusinessStatsResponse } from '../../../core/models/estadisticas';
import { EstadisticasPage } from './estadisticas-page';

registerLocaleData(localeEsAr);

const API = environment.apiUrl;
const URL_STATS = `${API}/businesses/n-1/stats`;

function stats(cambios: Partial<BusinessStatsResponse> = {}): BusinessStatsResponse {
  return {
    period: { from: '2026-10-01', to: '2026-10-28' },
    appointments: {
      total: 186,
      finished: 142,
      upcoming: 31,
      cancelled: 11,
      suspended: 2,
      occupancyRate: 93.01,
      cancellationRate: 5.98,
    },
    revenue: {
      totalFromFinished: 1842000,
      depositsCollected: 498600,
      depositsRefunded: 27300,
      depositsForfeited: 14850,
    },
    byService: [
      { serviceName: 'Corte clásico', appointmentCount: 51, revenue: 459000 },
      { serviceName: 'Corte + barba', appointmentCount: 64, revenue: 800000 },
    ],
    byEmployee: [
      { employeeId: 'e-1', employeeName: 'Lucia Morales', appointmentCount: 74, revenue: 1062000 },
    ],
    peakDays: [
      { dayOfWeek: 'FRIDAY', appointmentCount: 40 },
      { dayOfWeek: 'MONDAY', appointmentCount: 12 },
    ],
    uniqueClientsCount: 118,
    ...cambios,
  };
}

describe('EstadisticasPage', () => {
  let fixture: ComponentFixture<EstadisticasPage>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstadisticasPage],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EstadisticasPage);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function pedidoStats(): TestRequest {
    return httpMock.expectOne((r) => r.url === URL_STATS);
  }

  function pedidoEmpleado(id: string): TestRequest {
    return httpMock.expectOne((r) => r.url === `${URL_STATS}/employees/${id}`);
  }

  async function cargar(respuesta = stats(), horas = 68.5): Promise<void> {
    httpMock.expectOne(`${API}/businesses/mine`).flush({ id: 'n-1', name: 'Estudio Malbec' });
    pedidoStats().flush(respuesta);
    for (const empleado of respuesta.byEmployee) {
      pedidoEmpleado(empleado.employeeId).flush({ hoursWorked: horas });
    }
    await refrescar();
  }

  function boton(texto: string): HTMLButtonElement {
    return [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)!;
  }

  it('arranca con el mes y muestra los números del período', async () => {
    httpMock.expectOne(`${API}/businesses/mine`).flush({ id: 'n-1', name: 'Estudio Malbec' });
    const req = pedidoStats();
    expect(req.request.params.get('period')).toBe('MONTH');
    req.flush(stats());
    pedidoEmpleado('e-1').flush({ hoursWorked: 68.5 });
    await refrescar();

    const texto = el.textContent!;
    expect(texto).toContain('01/10 — 28/10/2026');
    expect(texto).toContain('186');
    expect(texto).toContain('93%');
    expect(texto).toContain('118');
    expect(texto).toContain('$1.842.000');
    expect(texto).toContain('$498.600');
    expect(texto).toContain('$27.300');
    expect(texto).toContain('$14.850');
    expect(texto).toContain('6%');
  });

  it('ordena los servicios por ingresos', async () => {
    await cargar();

    const nombres = [...el.querySelectorAll('[aria-labelledby="titulo-servicios"] li')].map((li) =>
      li.textContent?.trim(),
    );
    expect(nombres[0]).toContain('Corte + barba');
    expect(nombres[0]).toContain('64 · $800k');
    expect(nombres[1]).toContain('Corte clásico');
  });

  it('muestra los 7 días y resalta el pico', async () => {
    await cargar();

    const dias = [...el.querySelectorAll('[aria-labelledby="titulo-dias"] li')];
    expect(dias.length).toBe(7);
    expect(dias[0].getAttribute('aria-label')).toBe('Lunes: 12 turnos');
    expect(dias[4].getAttribute('aria-label')).toBe('Viernes: 40 turnos');
    expect(dias[6].getAttribute('aria-label')).toBe('Domingo: 0 turnos');
  });

  it('muestra las horas de cada profesional', async () => {
    await cargar(stats(), 68.5);

    const fila = el.querySelector('[aria-labelledby="titulo-profesionales"] tbody tr')!;
    expect(fila.textContent).toContain('Lucia Morales');
    expect(fila.textContent).toContain('68,5');
    expect(fila.textContent).toContain('$1.062.000');
  });

  it('si fallan las horas de un profesional, muestra "—"', async () => {
    httpMock.expectOne(`${API}/businesses/mine`).flush({ id: 'n-1', name: 'Estudio Malbec' });
    pedidoStats().flush(stats());
    pedidoEmpleado('e-1').flush(
      { status: 500, message: 'Error' },
      { status: 500, statusText: 'Error' },
    );
    await refrescar();

    const fila = el.querySelector('[aria-labelledby="titulo-profesionales"] tbody tr')!;
    expect(fila.textContent).toContain('—');
  });

  it('cambia de período', async () => {
    await cargar();
    boton('Semana').click();

    const req = pedidoStats();
    expect(req.request.params.get('period')).toBe('WEEK');
    req.flush(stats());
    pedidoEmpleado('e-1').flush({ hoursWorked: 10 });
  });

  it('con rango manda las fechas y no pide si están al revés', async () => {
    await cargar();
    boton('Rango…').click();
    await refrescar();

    // arranca con las fechas del período que se estaba viendo
    const rango = pedidoStats();
    expect(rango.request.params.get('dateFrom')).toBe('2026-10-01');
    expect(rango.request.params.get('dateTo')).toBe('2026-10-28');
    rango.flush(stats());
    pedidoEmpleado('e-1').flush({ hoursWorked: 10 });
    await refrescar();

    const [desde] = el.querySelectorAll<HTMLInputElement>('input[type="date"]');
    desde.value = '2026-11-15';
    desde.dispatchEvent(new Event('change'));
    await refrescar();

    httpMock.expectNone((r) => r.url === URL_STATS);
    expect(el.textContent).toContain('tiene que ser anterior');
  });

  it('sin turnos en el período muestra un aviso', async () => {
    await cargar(
      stats({
        appointments: {
          total: 0,
          finished: 0,
          upcoming: 0,
          cancelled: 0,
          suspended: 0,
          occupancyRate: 0,
          cancellationRate: 0,
        },
        byEmployee: [],
      }),
    );

    expect(el.textContent).toContain('No hubo turnos en este período');
  });

  it('sin negocio manda a crearlo', async () => {
    httpMock
      .expectOne(`${API}/businesses/mine`)
      .flush({ status: 404, message: 'No encontrado' }, { status: 404, statusText: 'Not Found' });
    await refrescar();

    expect(el.textContent).toContain('Todavía no creaste tu negocio');
  });

  it('si fallan las estadísticas permite reintentar', async () => {
    httpMock.expectOne(`${API}/businesses/mine`).flush({ id: 'n-1', name: 'Estudio Malbec' });
    pedidoStats().flush({ status: 500, message: 'Error' }, { status: 500, statusText: 'Error' });
    await refrescar();

    expect(el.textContent).toContain('No se pudieron cargar las estadísticas');
    boton('Reintentar').click();
    pedidoStats().flush(stats());
    pedidoEmpleado('e-1').flush({ hoursWorked: 10 });
  });
});
