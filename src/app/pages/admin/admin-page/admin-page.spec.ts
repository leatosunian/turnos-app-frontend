import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { errorInterceptor } from '../../../core/interceptors/error-interceptor';
import { AdminStatsResponse } from '../../../core/models/estadisticas';
import { AdminPage } from './admin-page';

registerLocaleData(localeEsAr);

const URL_STATS = `${environment.apiUrl}/admin/stats`;

/** Los últimos 6 meses contando el actual, como los arma la página. */
function ultimosMeses(): { year: number; month: number }[] {
  const hoy = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i), 1);
    return { year: fecha.getFullYear(), month: fecha.getMonth() + 1 };
  });
}

function stats(cambios: Partial<AdminStatsResponse> = {}): AdminStatsResponse {
  const meses = ultimosMeses();
  return {
    period: { from: '2026-10-01', to: '2026-10-31' },
    totalBusinesses: 214,
    activeBusinessesInPeriod: 163,
    totalUsers: 3902,
    newUsersInPeriod: 412,
    appointments: { total: 1000, finished: 800, cancelled: 62, suspended: 3 },
    revenue: {
      totalFromFinished: 90000000,
      depositsCollected: 41800000,
      depositsRefunded: 1200000,
      depositsForfeited: 300000,
    },
    topBusinesses: [
      {
        businessId: 'n-1',
        businessName: 'Estudio Malbec',
        appointmentCount: 186,
        revenue: 1842000,
      },
      { businessId: 'n-2', businessName: 'Spa Origen', appointmentCount: 142, revenue: 950000 },
    ],
    // el mes de hace 4 no viene: no tuvo altas
    userGrowth: [
      { ...meses[0], newUsers: 188 },
      { ...meses[2], newUsers: 260 },
      { ...meses[5], newUsers: 412 },
    ],
    ...cambios,
  };
}

describe('AdminPage', () => {
  let fixture: ComponentFixture<AdminPage>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPage],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPage);
    httpMock = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  function responder(respuesta: AdminStatsResponse, periodo = 'MONTH'): void {
    const req = httpMock.expectOne((r) => r.url === URL_STATS);
    expect(req.request.params.get('period')).toBe(periodo);
    req.flush(respuesta);
    fixture.detectChanges();
  }

  it('arranca pidiendo el mes y muestra los números de la plataforma', () => {
    responder(stats());

    const texto = el.textContent!;
    expect(texto).toContain('Plataforma · octubre');
    expect(texto).toContain('214');
    expect(texto).toContain('163 activos');
    expect(texto).toContain('3.902');
    expect(texto).toContain('+412 nuevos');
    expect(texto).toContain('6,2% cancelados');
    expect(texto).toContain('$41,8 M');
    expect(texto).toContain('$1,2 M devueltas');
  });

  it('el gráfico muestra los últimos 6 meses y completa en 0 los que no vienen', () => {
    responder(stats());

    const barras = el.querySelectorAll<HTMLElement>('[aria-labelledby="titulo-crecimiento"] li');
    expect(barras.length).toBe(6);
    const etiquetas = [...barras].map((b) => b.getAttribute('aria-label'));
    expect(etiquetas[0]).toContain('188 usuarios nuevos');
    expect(etiquetas[1]).toContain('0 usuarios nuevos');
    expect(etiquetas[5]).toContain('412 usuarios nuevos');
  });

  it('lista los negocios con más turnos en orden', () => {
    responder(stats());

    const filas = el.querySelectorAll<HTMLElement>('[aria-labelledby="titulo-negocios"] tbody tr');
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).toContain('Estudio Malbec');
    expect(filas[0].textContent).toContain('186');
    expect(filas[1].textContent).toContain('Spa Origen');
  });

  it('avisa cuando ningún negocio tuvo turnos', () => {
    responder(
      stats({
        topBusinesses: [],
        appointments: { total: 0, finished: 0, cancelled: 0, suspended: 0 },
      }),
    );

    expect(el.textContent).toContain('Ningún negocio tuvo turnos en este período.');
    expect(el.textContent).toContain('Sin turnos');
  });

  it('al cambiar a Año pide de nuevo y cambia el título', () => {
    responder(stats());

    const anio = [...el.querySelectorAll<HTMLButtonElement>('app-segmentado button')].find(
      (b) => b.textContent?.trim() === 'Año',
    )!;
    anio.click();
    fixture.detectChanges();
    responder(stats({ period: { from: '2026-01-01', to: '2026-12-31' } }), 'YEAR');

    expect(el.textContent).toContain('Plataforma · 2026');
  });

  it('si falla muestra el error y permite reintentar', () => {
    httpMock
      .expectOne((r) => r.url === URL_STATS)
      .flush({ status: 403, message: 'Acceso denegado' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Acceso denegado');

    el.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    fixture.detectChanges();
    responder(stats());

    expect(el.querySelector('[role="alert"]')).toBeNull();
  });
});
