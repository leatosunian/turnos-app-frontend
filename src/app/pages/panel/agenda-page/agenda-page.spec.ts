import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { errorInterceptor } from '../../../core/interceptors/error-interceptor';
import { DayScheduleResponse, DiaSemana } from '../../../core/models/horario';
import { AppointmentResponse } from '../../../core/models/turno';
import { claveDia, lunesDeSemana, sumarDias } from './agenda';
import { AgendaPage } from './agenda-page';

registerLocaleData(localeEsAr);

const API = `${environment.apiUrl}/businesses`;

// los tests usan la semana en la que se corren, asi no dependen de una fecha fija
const HOY = new Date();
const LUNES = lunesDeSemana(HOY);
// lunes 0 y domingo 6, igual que la pantalla
const NUMERO_HOY = (HOY.getDay() + 6) % 7;
const CLAVE_HOY = claveDia(HOY);
const CLAVE_SEMANA_QUE_VIENE = claveDia(sumarDias(HOY, 7));

function dia(day: DiaSemana, abierto = true): DayScheduleResponse {
  return {
    id: `d-${day}`,
    day,
    dayStart: '09:00:00',
    dayEnd: '12:00:00',
    appointmentDuration: 60,
    enabled: abierto,
    businessId: 'n-1',
  };
}

const SEMANA: DayScheduleResponse[] = ['DOM', 'MAR', 'LUN', 'MIE', 'JUE', 'VIE', 'SAB'].map((d) =>
  dia(d as DiaSemana),
);

function turno(datos: Partial<AppointmentResponse>): AppointmentResponse {
  return {
    id: 't',
    startDatetime: `${CLAVE_HOY}T09:00:00`,
    endDatetime: `${CLAVE_HOY}T09:45:00`,
    status: 'UNBOOKED',
    clientName: null,
    clientEmail: null,
    clientPhone: null,
    price: 12000,
    businessId: 'n-1',
    serviceId: 's-1',
    serviceName: 'Corte',
    employeeId: null,
    employeeName: null,
    createdAt: '2026-11-01T10:00:00',
    deposit: null,
    ...datos,
  };
}

const ANA = turno({
  id: 'ana',
  status: 'BOOKED',
  clientName: 'Ana Prueba',
  employeeId: 'e-1',
  employeeName: 'Lucia Gomez',
});
const LIBRE = turno({
  id: 'libre',
  startDatetime: `${CLAVE_HOY}T10:00:00`,
  endDatetime: `${CLAVE_HOY}T10:45:00`,
});
const PROXIMA = turno({
  id: 'proxima',
  startDatetime: `${CLAVE_SEMANA_QUE_VIENE}T11:00:00`,
  endDatetime: `${CLAVE_SEMANA_QUE_VIENE}T11:45:00`,
  clientName: 'Bruno Siguiente',
  status: 'BOOKED',
});
// uno de antes del lunes, para que la primera pagina ya alcance
const VIEJO = turno({
  id: 'viejo',
  startDatetime: `${claveDia(sumarDias(LUNES, -3))}T09:00:00`,
  endDatetime: `${claveDia(sumarDias(LUNES, -3))}T09:45:00`,
  status: 'CANCELLED',
});

function pagina(items: AppointmentResponse[], numero = 0, totalPaginas = 1) {
  return {
    content: items,
    number: numero,
    size: 100,
    totalElements: items.length,
    totalPages: totalPaginas,
  };
}

describe('AgendaPage', () => {
  let fixture: ComponentFixture<AgendaPage>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaPage],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AgendaPage);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function pedidoDeTurnos(numero: number) {
    return httpMock.expectOne(
      (req) => req.url === `${API}/n-1/appointments` && req.params.get('page') === String(numero),
    );
  }

  // el negocio, su horario, el equipo y los servicios; despues cada test responde los turnos
  async function cargarNegocio(semana = SEMANA): Promise<void> {
    httpMock.expectOne(`${API}/mine`).flush({ id: 'n-1', name: 'Barberia' });
    httpMock.expectOne(`${API}/n-1/schedule`).flush(semana);
    httpMock.expectOne(`${API}/n-1/employees`).flush([
      { id: 'e-1', name: 'Lucia Gomez' },
      { id: 'e-2', name: 'Tomas Perez' },
    ]);
    httpMock
      .expectOne(`${API}/n-1/services`)
      .flush([{ id: 's-1', name: 'Corte', durationMinutes: 45, price: 12000 }]);
    await refrescar();
  }

  async function cargar(turnos = [PROXIMA, LIBRE, ANA, VIEJO]): Promise<void> {
    await cargarNegocio();
    const pedido = pedidoDeTurnos(0);
    // del mas nuevo al mas viejo, como los pide la pantalla
    expect(pedido.request.params.get('sort')).toBe('startDatetime,desc');
    pedido.flush(pagina(turnos));
    await refrescar();
  }

  function filas(): string[] {
    return [...el.querySelectorAll('ul[aria-label="Turnos del día"] > li')].map((li) =>
      li.textContent!.replace(/\s+/g, ' ').trim(),
    );
  }

  it('arranca en el dia de hoy con sus turnos en cada fila', async () => {
    await cargar();

    const pestaniaHoy = el.querySelector(`#pestania-${NUMERO_HOY}`)!;
    expect(pestaniaHoy.getAttribute('aria-selected')).toBe('true');

    const textos = filas();
    expect(textos.length).toBe(3);
    expect(textos[0]).toContain('09:00');
    expect(textos[0]).toContain('Ana Prueba');
    expect(textos[0]).toContain('Corte · Lucia Gomez');
    expect(textos[1]).toContain('Libre');
    expect(textos[1]).toContain('Corte · Sin asignar');
    expect(textos[2]).not.toContain('Corte');
    expect(el.textContent).toContain('1 reservado · 1 libre');
  });

  it('pide mas paginas hasta llegar al lunes de la semana', async () => {
    await cargarNegocio();
    // la primera pagina no llega a antes del lunes y el back dice que hay otra
    pedidoDeTurnos(0).flush(pagina([PROXIMA, LIBRE], 0, 2));
    await refrescar();
    expect(el.textContent).toContain('Cargando turnos');

    pedidoDeTurnos(1).flush(pagina([ANA, VIEJO], 1, 2));
    await refrescar();
    expect(el.textContent).toContain('1 reservado · 1 libre');
  });

  it('filtra por profesional', async () => {
    await cargar();
    const select = el.querySelector<HTMLSelectElement>('select')!;
    select.value = 'e-1';
    select.dispatchEvent(new Event('change'));
    await refrescar();

    expect(filas().join(' ')).toContain('Ana Prueba');
    expect(filas().join(' ')).not.toContain('Libre');

    select.value = 'sin-asignar';
    select.dispatchEvent(new Event('change'));
    await refrescar();
    expect(filas().join(' ')).not.toContain('Ana Prueba');
    expect(filas().join(' ')).toContain('Libre');
  });

  it('pasa a la semana siguiente y muestra sus turnos', async () => {
    await cargar();
    el.querySelector<HTMLButtonElement>('button[aria-label="Semana siguiente"]')!.click();
    await refrescar();

    // el mismo dia de la semana, pero 7 dias despues
    expect(filas().join(' ')).toContain('Bruno Siguiente');
    expect(filas().join(' ')).not.toContain('Ana Prueba');

    el.querySelector<HTMLButtonElement>('button[aria-label="Semana anterior"]')!.click();
    await refrescar();
    expect(filas().join(' ')).toContain('Ana Prueba');
  });

  it('crea un turno desde el + de una fila y lo muestra en su lugar', async () => {
    await cargar();
    // la semana que viene, asi todas las filas son futuras sin importar la hora del test
    el.querySelector<HTMLButtonElement>('button[aria-label="Semana siguiente"]')!.click();
    await refrescar();

    const mas = el.querySelector<HTMLButtonElement>(
      'button[aria-label="Crear un turno a las 10:00"]',
    );
    expect(mas).not.toBeNull();
    mas!.click();
    await refrescar();
    expect(el.querySelector('app-nuevo-turno-dialogo')).not.toBeNull();

    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await refrescar();
    const pedido = httpMock.expectOne(
      (req) => req.method === 'POST' && req.url === `${API}/n-1/appointments`,
    );
    expect(pedido.request.body.startDatetime).toBe(`${CLAVE_SEMANA_QUE_VIENE}T10:00:00`);
    pedido.flush(
      turno({
        id: 'creado',
        startDatetime: `${CLAVE_SEMANA_QUE_VIENE}T10:00:00`,
        endDatetime: `${CLAVE_SEMANA_QUE_VIENE}T10:45:00`,
        serviceName: 'Corte',
      }),
    );
    await refrescar();

    expect(el.querySelector('app-nuevo-turno-dialogo')).toBeNull();
    expect(filas()[1]).toContain('10:00–10:45');
    expect(filas()[1]).toContain('Libre');
  });

  it('no ofrece crear turnos en dias que ya pasaron', async () => {
    await cargar();
    el.querySelector<HTMLButtonElement>('button[aria-label="Semana anterior"]')!.click();
    await refrescar();
    // la primera pagina ya decia que no habia mas, asi que no se pide nada nuevo
    expect(el.querySelector('button[aria-label^="Crear un turno"]')).toBeNull();
  });

  it('al tocar una tarjeta abre su detalle y si se elimina sale de la fila', async () => {
    await cargar();
    el.querySelector<HTMLButtonElement>('button[aria-label^="Ver turno de 10:00, libre"]')!.click();
    await refrescar();
    expect(el.querySelector('app-detalle-turno-dialogo')).not.toBeNull();

    const botones = () => [
      ...el.querySelectorAll<HTMLButtonElement>('app-detalle-turno-dialogo button'),
    ];
    botones()
      .find((b) => b.textContent!.trim() === 'Eliminar turno')!
      .click();
    await refrescar();
    botones()
      .find((b) => b.textContent!.trim() === 'Sí, eliminar')!
      .click();
    await refrescar();
    httpMock
      .expectOne(`${environment.apiUrl}/appointments/libre`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await refrescar();

    expect(el.querySelector('app-detalle-turno-dialogo')).toBeNull();
    expect(filas()[1]).not.toContain('Libre');
    expect(el.textContent).toContain('1 reservado');
  });

  it('en un dia cerrado avisa pero igual muestra las filas para crear a mano', async () => {
    await cargarNegocio(SEMANA.map((d) => ({ ...d, enabled: false })));
    pedidoDeTurnos(0).flush(pagina([]));
    await refrescar();

    expect(el.textContent).toContain('Este día está cerrado');
    expect(filas().length).toBe(3);

    // la semana que viene, asi las filas son futuras sin importar la hora del test
    el.querySelector<HTMLButtonElement>('button[aria-label="Semana siguiente"]')!.click();
    await refrescar();
    expect(el.querySelector('button[aria-label="Crear un turno a las 09:00"]')).not.toBeNull();
  });

  it('un dia que nunca se abrio usa el horario por defecto de Horarios', async () => {
    await cargarNegocio(
      SEMANA.map((d) => ({
        ...d,
        enabled: false,
        dayStart: null,
        dayEnd: null,
        appointmentDuration: null,
      })),
    );
    pedidoDeTurnos(0).flush(pagina([]));
    await refrescar();

    // de 09:00 a 18:00 cada 30 son 18 filas
    expect(filas().length).toBe(18);
    expect(el.textContent).toContain('09:00 a 18:00 · cada 30 min');
  });

  it('sin negocio invita a crearlo', async () => {
    httpMock
      .expectOne(`${API}/mine`)
      .flush({ message: 'No encontrado' }, { status: 404, statusText: 'Not Found' });
    await refrescar();
    expect(el.textContent).toContain('Todavía no creaste tu negocio');
  });
});

// "+ Nuevo turno" del menu lleva a /panel/agenda?nuevo=1. Va aparte porque necesita la ruta con
// el parametro y una hora fija: el miercoles 18 de noviembre de 2026 a las 10:20
describe('AgendaPage con ?nuevo=1', () => {
  let harness: RouterTestingHarness;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 10, 20));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'panel/agenda', component: AgendaPage }]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  async function abrir(semana = SEMANA): Promise<HTMLElement> {
    await harness.navigateByUrl('/panel/agenda?nuevo=1');
    httpMock.expectOne(`${API}/mine`).flush({ id: 'n-1', name: 'Barberia' });
    httpMock.expectOne(`${API}/n-1/schedule`).flush(semana);
    httpMock.expectOne(`${API}/n-1/employees`).flush([]);
    httpMock
      .expectOne(`${API}/n-1/services`)
      .flush([{ id: 's-1', name: 'Corte', durationMinutes: 45, price: 12000 }]);
    harness.detectChanges();
    await harness.fixture.whenStable();
    httpMock.expectOne((req) => req.url === `${API}/n-1/appointments`).flush(pagina([]));
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement!;
  }

  it('abre el diálogo de nuevo turno en la primera fila libre de hoy y limpia la URL', async () => {
    const el = await abrir();

    // abre de 9 a 12 de a 60: la fila de las 10:00 todavía tiene lugar; la primera hora que
    // ofrece es la siguiente a las 10:20, las 10:25
    expect(el.querySelector('app-nuevo-turno-dialogo')).not.toBeNull();
    expect(el.textContent).toContain('Nuevo turno · Miércoles 18 de noviembre');
    expect(el.querySelector<HTMLSelectElement>('app-nuevo-turno-dialogo select')!.value).toBe(
      '10:25',
    );
    expect(TestBed.inject(Router).url).toBe('/panel/agenda');
  });

  it('si hoy ya cerró, lo abre en el día siguiente', async () => {
    vi.setSystemTime(new Date(2026, 10, 18, 13, 0));
    const el = await abrir();

    expect(el.textContent).toContain('Nuevo turno · Jueves 19 de noviembre');
  });
});
