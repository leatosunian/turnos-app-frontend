import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { errorInterceptor } from '../../../../core/interceptors/error-interceptor';
import { AppointmentResponse } from '../../../../core/models/turno';
import { AperturaNuevoTurno, NuevoTurnoDialogo } from './nuevo-turno-dialogo';

registerLocaleData(localeEsAr);

const URL = `${environment.apiUrl}/businesses/n-1/appointments`;

// el lunes 16 de noviembre de 2026, con la fila de las 10:00 de a 30 minutos
const APERTURA: AperturaNuevoTurno = {
  clave: '2026-11-16',
  fecha: new Date(2026, 10, 16),
  hora: '10:00',
  intervalo: 30,
  empleadoId: null,
};
// el viernes anterior, asi todas las horas de la fila estan disponibles
const AHORA = new Date(2026, 10, 13, 12, 0);

const SERVICIOS = [
  {
    id: 's-1',
    name: 'Corte',
    durationMinutes: 45,
    price: 12000,
    depositPorcentage: 30,
    businessId: 'n-1',
  },
  {
    id: 's-2',
    name: 'Barba',
    durationMinutes: 30,
    price: 8000,
    depositPorcentage: 30,
    businessId: 'n-1',
  },
];
const EQUIPO = [
  { id: 'e-1', name: 'Lucia Gomez', email: 'l@b.test', createdAt: '', active: true, roles: [] },
  { id: 'e-2', name: 'Tomas Perez', email: 't@b.test', createdAt: '', active: true, roles: [] },
];

// un turno de Lucia de 09:30 a 10:15, que se pisa con cualquiera de ella antes de las 10:15
const DE_LUCIA = {
  id: 'ana',
  startDatetime: '2026-11-16T09:30:00',
  endDatetime: '2026-11-16T10:15:00',
  status: 'BOOKED',
  clientName: 'Ana Prueba',
  employeeId: 'e-1',
} as AppointmentResponse;

describe('NuevoTurnoDialogo', () => {
  let fixture: ComponentFixture<NuevoTurnoDialogo>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;
  let guardado: AppointmentResponse | null;

  async function abrir(apertura: Partial<AperturaNuevoTurno> = {}): Promise<void> {
    fixture = TestBed.createComponent(NuevoTurnoDialogo);
    fixture.componentRef.setInput('businessId', 'n-1');
    fixture.componentRef.setInput('apertura', { ...APERTURA, ...apertura });
    fixture.componentRef.setInput('servicios', SERVICIOS);
    fixture.componentRef.setInput('equipo', EQUIPO);
    fixture.componentRef.setInput('turnosDelDia', [DE_LUCIA]);
    fixture.componentRef.setInput('ahora', AHORA);
    guardado = null;
    fixture.componentInstance.guardado.subscribe((turno) => (guardado = turno));
    el = fixture.nativeElement;
    await refrescar();
  }

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function selects(): HTMLSelectElement[] {
    return [...el.querySelectorAll('select')];
  }

  async function elegir(select: HTMLSelectElement, valor: string): Promise<void> {
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    await refrescar();
  }

  async function escribir(input: HTMLInputElement, valor: string): Promise<void> {
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    await refrescar();
  }

  function enviar(): Promise<void> {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    return refrescar();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoTurnoDialogo],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('ofrece las horas de la fila de a 5 minutos y calcula el fin', async () => {
    await abrir();
    expect(el.textContent).toContain('Nuevo turno · Lunes 16 de noviembre');
    const horas = [...selects()[0].options].map((o) => o.value);
    expect(horas).toEqual(['10:00', '10:05', '10:10', '10:15', '10:20', '10:25']);
    expect(el.textContent).toContain('Termina a las 10:45');

    await elegir(selects()[1], 's-2');
    expect(el.textContent).toContain('Termina a las 10:30');
  });

  it('crea un turno libre sin datos del cliente', async () => {
    await abrir();
    await enviar();
    const pedido = httpMock.expectOne(URL);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({
      startDatetime: '2026-11-16T10:00:00',
      serviceId: 's-1',
      employeeId: null,
    });
    pedido.flush({ id: 'nuevo' });
    expect(guardado?.id).toBe('nuevo');
  });

  it('avisa si se pisa con otro turno del mismo profesional y no deja crear', async () => {
    await abrir();
    await elegir(selects()[2], 'e-1');
    expect(el.textContent).toContain('Se pisa con el turno de Ana Prueba de 09:30 a 10:15.');
    expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);

    // a las 10:15 ya terminó el de Ana
    await elegir(selects()[0], '10:15');
    expect(el.textContent).not.toContain('Se pisa');
  });

  it('arranca con el profesional del filtro de la agenda', async () => {
    await abrir({ empleadoId: 'e-2' });
    expect(selects()[2].value).toBe('e-2');
  });

  it('para un cliente pide el nombre y manda solo lo completado', async () => {
    await abrir();
    el.querySelectorAll<HTMLButtonElement>('app-segmentado button')[1].click();
    await refrescar();

    await enviar();
    expect(el.textContent).toContain('Ingresá el nombre del cliente.');
    httpMock.expectNone(URL);

    const [nombre, , telefono] = [...el.querySelectorAll<HTMLInputElement>('input')];
    await escribir(nombre, '  Bruno Diaz ');
    await escribir(telefono, '12');
    await enviar();
    expect(el.textContent).toContain('Ingresá entre 7 y 20 caracteres');
    httpMock.expectNone(URL);

    await escribir(telefono, '11 5555-1234');
    await enviar();
    const pedido = httpMock.expectOne(URL);
    expect(pedido.request.body).toEqual({
      startDatetime: '2026-11-16T10:00:00',
      serviceId: 's-1',
      employeeId: null,
      clientName: 'Bruno Diaz',
      clientPhone: '11 5555-1234',
    });
    pedido.flush({ id: 'nuevo' });
  });

  it('muestra el error del back si no se pudo crear', async () => {
    await abrir();
    await enviar();
    httpMock
      .expectOne(URL)
      .flush(
        { message: 'Ese profesional ya tiene un turno que se superpone con este horario.' },
        { status: 409, statusText: 'Conflict' },
      );
    await refrescar();
    expect(el.textContent).toContain('ya tiene un turno que se superpone');
    expect(guardado).toBeNull();
  });
});
