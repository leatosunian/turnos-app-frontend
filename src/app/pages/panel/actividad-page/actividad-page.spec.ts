import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import {
  EmployeeStatsResponse,
  PeriodoActividad,
  PeriodoFechas,
} from '../../../core/models/actividad';
import { UserResponse } from '../../../core/models/usuario';
import { ActividadService } from '../../../core/services/actividad-service';
import { AuthService } from '../../../core/services/auth-service';
import { ActividadPage } from './actividad-page';

registerLocaleData(localeEsAr);

// martes 10 de noviembre de 2026
const AHORA = new Date(2026, 10, 10, 12, 0);

const EMPLEADO: UserResponse = {
  id: 'e-1',
  name: 'Tomás Rivero',
  email: 'tomas@mail.com',
  createdAt: '2026-01-01T00:00:00',
  active: true,
  roles: ['EMPLOYEE'],
  businessId: 'n-1',
  businessName: 'Estudio Malbec',
};

function stats(extra: Partial<EmployeeStatsResponse> = {}): EmployeeStatsResponse {
  return {
    employeeId: 'e-1',
    employeeName: 'Tomás Rivero',
    period: { from: '2026-11-01', to: '2026-11-30' },
    appointments: { total: 81, finished: 68, upcoming: 10, cancelled: 3, occupancyRate: 96 },
    hoursWorked: 57,
    revenueGenerated: 780000,
    byService: [
      { serviceName: 'Barba', appointmentCount: 8, revenue: 0 },
      { serviceName: 'Corte + barba', appointmentCount: 40, revenue: 0 },
      { serviceName: 'Corte clásico', appointmentCount: 20, revenue: 0 },
    ],
    ...extra,
  };
}

describe('ActividadPage', () => {
  let fixture: ComponentFixture<ActividadPage>;
  let usuario: ReturnType<typeof signal<UserResponse | null>>;
  let servicio: {
    delEmpleado: ReturnType<
      typeof vi.fn<
        (
          b: string,
          e: string,
          p: PeriodoActividad | PeriodoFechas,
        ) => Observable<EmployeeStatsResponse>
      >
    >;
  };
  let cerrarSesion: ReturnType<typeof vi.fn>;

  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => el().textContent?.replace(/\s+/g, ' ') ?? '';
  const boton = (nombre: string) =>
    [...el().querySelectorAll('button')].find((b) => b.textContent?.trim() === nombre)!;

  async function crear() {
    fixture = TestBed.createComponent(ActividadPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AHORA);
    usuario = signal<UserResponse | null>(EMPLEADO);
    cerrarSesion = vi.fn();
    servicio = {
      // el período actual con 780.000 y el anterior con 722.000 (+8%)
      delEmpleado: vi.fn((_b, _e, periodo) =>
        of(typeof periodo === 'string' ? stats() : stats({ revenueGenerated: 722000 })),
      ),
    };
    TestBed.configureTestingModule({
      imports: [ActividadPage],
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
        { provide: ActividadService, useValue: servicio },
        { provide: AuthService, useValue: { usuario, cerrarSesion } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('pide el mes del empleado y el mes anterior para comparar', async () => {
    await crear();

    expect(servicio.delEmpleado).toHaveBeenCalledWith('n-1', 'e-1', 'MONTH');
    expect(servicio.delEmpleado).toHaveBeenCalledWith('n-1', 'e-1', {
      from: '2026-10-01',
      to: '2026-10-31',
    });
  });

  it('saluda y muestra el período y el negocio', async () => {
    await crear();

    expect(el().querySelector('h1')!.textContent!.trim()).toBe('Hola, Tomás');
    expect(texto()).toContain('01/11 — 30/11/2026 · Estudio Malbec');
  });

  it('muestra turnos atendidos, horas e ingresos con la comparación', async () => {
    await crear();

    expect(texto()).toContain('Turnos atendidos de 81 asignados 68');
    // 57 h en los 10 días que van de noviembre
    expect(texto()).toContain('Horas trabajadas promedio 5,7 h por día 57,0');
    expect(texto()).toContain('Ingresos generados +8% vs octubre $780.000');
  });

  it('sin ingresos anteriores no muestra la comparación', async () => {
    servicio.delEmpleado.mockImplementation((_b, _e, periodo) =>
      typeof periodo === 'string' ? of(stats()) : throwError(() => ({ status: 500 })),
    );
    await crear();

    expect(texto()).toContain('$780.000');
    expect(texto()).not.toContain('% vs');
  });

  it('ordena los servicios por cantidad y escala las barras al mayor', async () => {
    await crear();

    const filas = [...el().querySelectorAll('[aria-labelledby="por-servicio"] .flex-col')];
    expect(filas.map((f) => f.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
      'Corte + barba 40 turnos',
      'Corte clásico 20 turnos',
      'Barba 8 turnos',
    ]);
    const anchos = filas.map((f) => (f.querySelector('.bg-accent') as HTMLElement).style.width);
    expect(anchos).toEqual(['100%', '50%', '20%']);
  });

  it('cambiar el período vuelve a pedir y compara contra el período anterior', async () => {
    await crear();
    servicio.delEmpleado.mockClear();

    boton('Semana').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(servicio.delEmpleado).toHaveBeenCalledWith('n-1', 'e-1', 'WEEK');
    expect(servicio.delEmpleado).toHaveBeenCalledWith('n-1', 'e-1', {
      from: '2026-11-02',
      to: '2026-11-08',
    });
    expect(texto()).toContain('vs la semana pasada');
  });

  it('en el año el promedio de horas va por mes y compara con el año anterior', async () => {
    servicio.delEmpleado.mockImplementation((_b, _e, periodo) =>
      of(
        typeof periodo === 'string'
          ? stats({ period: { from: '2026-01-01', to: '2026-12-31' }, hoursWorked: 550 })
          : stats({ revenueGenerated: 1000000 }),
      ),
    );
    await crear();

    boton('Año').click();
    await fixture.whenStable();
    fixture.detectChanges();

    // 550 h en los 11 meses que van del año
    expect(texto()).toContain('promedio 50,0 h por mes');
    expect(texto()).toContain('-22% vs 2025');
  });

  it('sin negocio en la sesión avisa y no pide nada', async () => {
    usuario.set({ ...EMPLEADO, businessId: null, businessName: null });
    await crear();

    expect(servicio.delEmpleado).not.toHaveBeenCalled();
    expect(texto()).toContain('Todavía no podemos mostrar tus números');
  });

  it('si falla la carga deja reintentar', async () => {
    servicio.delEmpleado.mockReturnValue(throwError(() => ({ status: 500 })));
    await crear();
    expect(texto()).toContain('No pudimos traer tus números');

    servicio.delEmpleado.mockReturnValue(of(stats()));
    boton('Reintentar').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).toContain('Turnos atendidos');
  });

  it('cerrar sesión usa el servicio de auth', async () => {
    await crear();
    boton('Cerrar sesión').click();
    expect(cerrarSesion).toHaveBeenCalled();
  });
});
