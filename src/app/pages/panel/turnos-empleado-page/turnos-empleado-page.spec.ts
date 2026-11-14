import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { Pagina } from '../../../core/models/pagina';
import { AppointmentResponse } from '../../../core/models/turno';
import { UserResponse } from '../../../core/models/usuario';
import {
  AppointmentService,
  FiltroTurnosEmpleado,
} from '../../../core/services/appointment-service';
import { AuthService } from '../../../core/services/auth-service';
import { TurnosEmpleadoPage } from './turnos-empleado-page';

registerLocaleData(localeEsAr);

// viernes 13 de noviembre de 2026 a la noche
const AHORA = new Date(2026, 10, 13, 21, 0);

const EMPLEADA: UserResponse = {
  id: 'e-1',
  name: 'Lucía Gómez',
  email: 'lucia@prueba.test',
  createdAt: '2026-01-01T00:00:00',
  active: true,
  roles: ['EMPLOYEE'],
  businessId: 'n-1',
  businessName: 'Barbería Prueba',
};

function turno(extra: Partial<AppointmentResponse>): AppointmentResponse {
  return {
    id: 't-1',
    startDatetime: '2026-11-14T10:00:00',
    endDatetime: '2026-11-14T10:45:00',
    status: 'BOOKED',
    clientName: 'Martín Sosa',
    clientEmail: 'martin@prueba.test',
    clientPhone: '11 5555-0101',
    price: 12000,
    businessId: 'n-1',
    businessName: 'Barbería Prueba',
    businessSlug: 'barberia-prueba',
    serviceId: 's-1',
    serviceName: 'Corte de pelo',
    employeeId: 'e-1',
    employeeName: 'Lucía Gómez',
    createdAt: '2026-11-13T10:00:00',
    deposit: null,
    ...extra,
  } as AppointmentResponse;
}

function pagina(items: AppointmentResponse[], total = items.length): Pagina<AppointmentResponse> {
  return { items, numero: 0, tamanio: 20, total, totalPaginas: Math.ceil(total / 20) };
}

describe('TurnosEmpleadoPage', () => {
  let fixture: ComponentFixture<TurnosEmpleadoPage>;
  let deEmpleado: ReturnType<
    typeof vi.fn<(f: FiltroTurnosEmpleado) => Observable<Pagina<AppointmentResponse>>>
  >;

  async function crear(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [TurnosEmpleadoPage],
      providers: [
        { provide: LOCALE_ID, useValue: 'es-AR' },
        { provide: AuthService, useValue: { usuario: signal(EMPLEADA) } },
        { provide: AppointmentService, useValue: { deEmpleado } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TurnosEmpleadoPage);
    await fixture.whenStable();
  }

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const boton = (nombre: string) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes(nombre),
    )!;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AHORA);
    deEmpleado = vi.fn(() => of(pagina([])));
  });

  afterEach(() => vi.useRealTimers());

  it('arranca en Próximos: pide desde hoy, del más cercano al más lejano', async () => {
    await crear();
    expect(deEmpleado).toHaveBeenCalledWith(
      expect.objectContaining({ desde: '2026-11-13', sort: 'startDatetime,asc', page: 0 }),
    );
    expect(deEmpleado.mock.calls[0][0].hasta).toBeUndefined();
  });

  it('muestra los turnos agrupados por día con cliente, contacto y estado', async () => {
    deEmpleado.mockReturnValue(
      of(
        pagina([
          turno({}),
          turno({
            id: 't-2',
            startDatetime: '2026-11-14T12:00:00',
            endDatetime: '2026-11-14T13:00:00',
            status: 'AWAITING_PAYMENT',
            clientName: 'Diego Romero',
            clientPhone: null,
            clientEmail: 'diego@prueba.test',
            serviceName: 'Corte + barba',
          }),
          turno({
            id: 't-3',
            startDatetime: '2026-11-16T10:00:00',
            endDatetime: '2026-11-16T10:45:00',
            status: 'UNBOOKED',
            clientName: null,
            clientPhone: null,
            clientEmail: null,
          }),
        ]),
      ),
    );
    await crear();

    const grupos = (fixture.nativeElement as HTMLElement).querySelectorAll('section h2');
    expect(grupos.length).toBe(2);
    expect(grupos[0].textContent).toContain('Mañana');
    expect(texto()).toContain('Martín Sosa');
    expect(texto()).toContain('11 5555-0101');
    // sin telefono se muestra el email para poder contactarlo
    expect(texto()).toContain('diego@prueba.test');
    expect(texto()).toContain('Esperando seña');
    expect(texto()).toContain('Sin reservar');
    expect(texto()).toContain('3 de 3');
  });

  it('Anteriores pide hasta ayer, del más reciente para atrás', async () => {
    await crear();
    boton('Anteriores').click();
    await fixture.whenStable();

    const filtro = deEmpleado.mock.calls.at(-1)![0];
    expect(filtro.hasta).toBe('2026-11-12');
    expect(filtro.desde).toBeUndefined();
    expect(filtro.sort).toBe('startDatetime,desc');
  });

  it('el select de estado filtra y el aviso vacío deja volver a todos', async () => {
    await crear();
    const select = (fixture.nativeElement as HTMLElement).querySelector('select')!;
    select.value = 'CANCELLED';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(deEmpleado.mock.calls.at(-1)![0].status).toBe('CANCELLED');
    expect(texto()).toContain('No tenés turnos próximos');

    boton('Ver todos').click();
    await fixture.whenStable();
    expect(deEmpleado.mock.calls.at(-1)![0].status).toBeNull();
  });

  it('Cargar más suma la página siguiente abajo', async () => {
    deEmpleado.mockReturnValueOnce(of(pagina([turno({})], 21)));
    deEmpleado.mockReturnValueOnce(
      of(pagina([turno({ id: 't-9', clientName: 'Pablo Medina' })], 21)),
    );
    await crear();

    boton('Cargar más').click();
    await fixture.whenStable();

    expect(deEmpleado.mock.calls.at(-1)![0].page).toBe(1);
    expect(texto()).toContain('Martín Sosa');
    expect(texto()).toContain('Pablo Medina');
  });

  it('si falla muestra el error y deja reintentar', async () => {
    deEmpleado.mockReturnValueOnce(throwError(() => ({ status: 0, message: 'Sin conexión' })));
    await crear();
    expect(texto()).toContain('No se pudieron cargar tus turnos');
    expect(texto()).toContain('Sin conexión');

    boton('Reintentar').click();
    await fixture.whenStable();
    expect(deEmpleado).toHaveBeenCalledTimes(2);
  });
});
