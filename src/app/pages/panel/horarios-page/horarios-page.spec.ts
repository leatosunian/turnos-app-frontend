import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { errorInterceptor } from '../../../core/interceptors/error-interceptor';
import {
  AppointmentScheduleResponse,
  DayScheduleResponse,
  DiaSemana,
} from '../../../core/models/horario';
import { BusinessResponse } from '../../../core/models/negocio';
import { HorariosPage } from './horarios-page';

registerLocaleData(localeEsAr);

const API = `${environment.apiUrl}/businesses`;

function dia(day: DiaSemana, abierto: boolean): DayScheduleResponse {
  return {
    id: `d-${day}`,
    day,
    dayStart: abierto ? '10:00:00' : null,
    dayEnd: abierto ? '12:00:00' : null,
    appointmentDuration: abierto ? 60 : null,
    enabled: abierto,
    businessId: 'n-1',
  };
}

// el back manda los dias desordenados, asi que el mock tambien
const SEMANA: DayScheduleResponse[] = [
  dia('DOM', false),
  dia('MAR', false),
  dia('LUN', true),
  dia('MIE', false),
  dia('JUE', false),
  dia('VIE', false),
  dia('SAB', false),
];

const CORTE_LUNES: AppointmentScheduleResponse = {
  id: 't-1',
  dayNumber: 0,
  startTime: '10:00:00',
  endTime: '10:45:00',
  price: 12000,
  businessId: 'n-1',
  serviceId: 's-1',
  employeeId: 'e-1',
};

const NEGOCIO: BusinessResponse = {
  id: 'n-1',
  name: 'Barberia',
  email: 'b@b.test',
  slug: 'barberia',
  phone: '541145678901',
  description: null,
  automaticSchedule: true,
  scheduleEnd: '2026-11-25T00:00:00',
  scheduleDaysToCreate: 14,
  scheduleAnticipation: 5,
  deleted: false,
  ownerId: 'u-1',
  businessTypes: [],
};

// lo que tiene que mandar el PUT del negocio: todo el negocio salvo id, deleted, ownerId y rubros
const PEDIDO_NEGOCIO = {
  name: 'Barberia',
  email: 'b@b.test',
  slug: 'barberia',
  phone: '541145678901',
  description: undefined,
  automaticSchedule: true,
  scheduleEnd: '2026-11-25T00:00:00',
  scheduleDaysToCreate: 14,
  scheduleAnticipation: 5,
};

describe('HorariosPage', () => {
  let fixture: ComponentFixture<HorariosPage>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorariosPage],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HorariosPage);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function cargar(automatica = true): Promise<void> {
    httpMock.expectOne(`${API}/mine`).flush({ ...NEGOCIO, automaticSchedule: automatica });
    httpMock.expectOne(`${API}/n-1/schedule`).flush(SEMANA);
    httpMock.expectOne(`${API}/n-1/appointment-schedules`).flush([CORTE_LUNES]);
    httpMock
      .expectOne(`${API}/n-1/services`)
      .flush([{ id: 's-1', name: 'Corte de pelo', durationMinutes: 45, price: 12000 }]);
    httpMock.expectOne(`${API}/n-1/employees`).flush([{ id: 'e-1', name: 'Lucia Gomez' }]);
    await refrescar();
  }

  async function elegir(dia: DiaSemana): Promise<void> {
    el.querySelector<HTMLButtonElement>(`#pestania-${dia}`)!.click();
    await refrescar();
  }

  it('ordena las pestañas de lunes a domingo', async () => {
    await cargar();
    const pestanias = [...el.querySelectorAll('[role=tab]')].map((b) => b.textContent?.trim());
    expect(pestanias).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
  });

  it('arma la grilla del lunes con una fila por intervalo y su turno programado', async () => {
    await cargar();
    await elegir('LUN');
    const horas = [...el.querySelectorAll('#panel-dia li > div:first-child > span')].map((s) =>
      s.textContent?.trim(),
    );
    expect(horas).toEqual(['10:00', '11:00']);
    const tarjeta = el.querySelector('button[aria-label^="Editar"]');
    expect(tarjeta?.getAttribute('aria-label')).toBe(
      'Editar Corte de pelo de 10:00 a 10:45, Lucia Gomez',
    );
  });

  it('al abrir un dia sin horario le pone el horario por defecto y lo guarda', async () => {
    await cargar();
    await elegir('MAR');
    el.querySelector<HTMLButtonElement>('#panel-dia [role=switch]')!.click();
    await refrescar();

    const req = httpMock.expectOne(`${API}/n-1/schedule`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual([
      { day: 'MAR', enabled: true, dayStart: '09:00', dayEnd: '18:00', appointmentDuration: 30 },
    ]);
    req.flush([{ ...dia('MAR', true), dayStart: '09:00:00', dayEnd: '18:00:00' }]);
    await refrescar();
    expect(el.querySelector('[aria-live=polite]')?.textContent?.trim()).toBe('Guardado');
  });

  it('si el back rechaza el cambio, el dia vuelve a como estaba', async () => {
    await cargar();
    await elegir('LUN');
    el.querySelector<HTMLButtonElement>('#panel-dia [role=switch]')!.click();
    await refrescar();

    httpMock
      .expectOne(`${API}/n-1/schedule`)
      .flush({ status: 400, message: 'Día inválido' }, { status: 400, statusText: 'Bad Request' });
    await refrescar();
    expect(el.querySelector('#panel-dia [role=switch]')?.getAttribute('aria-checked')).toBe('true');
    expect(el.querySelector('[aria-live=polite]')?.textContent?.trim()).toBe('Día inválido');
  });

  describe('agenda automatica', () => {
    const interruptor = () =>
      el.querySelector<HTMLButtonElement>('#agenda-automatica [role=switch]')!;
    const botonGenerar = () =>
      [...el.querySelectorAll<HTMLButtonElement>('#agenda-automatica button')].find((b) =>
        b.textContent?.includes('Generar'),
      )!;
    const campo = (etiqueta: string) =>
      [...el.querySelectorAll('#agenda-automatica label')]
        .find((l) => l.textContent?.includes(etiqueta))!
        .querySelector('input')!;

    it('apagarla manda el negocio entero con automaticSchedule en false', async () => {
      await cargar();
      interruptor().click();
      await refrescar();

      const req = httpMock.expectOne(`${API}/n-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ ...PEDIDO_NEGOCIO, automaticSchedule: false });
      req.flush({ ...NEGOCIO, automaticSchedule: false });
      await refrescar();
      expect(interruptor().getAttribute('aria-checked')).toBe('false');
      expect(botonGenerar().disabled).toBe(true);
    });

    it('guarda los dias a crear cuando se deja de escribir', async () => {
      await cargar();
      const dias = campo('Días a crear');
      dias.value = '30';
      dias.dispatchEvent(new Event('input'));
      // la espera antes de guardar es de 600 ms
      await new Promise((listo) => setTimeout(listo, 650));
      await refrescar();

      const req = httpMock.expectOne(`${API}/n-1`);
      expect(req.request.body).toEqual({ ...PEDIDO_NEGOCIO, scheduleDaysToCreate: 30 });
      req.flush({ ...NEGOCIO, scheduleDaysToCreate: 30, scheduleEnd: '2026-12-11T00:00:00' });
      await refrescar();
      expect(el.querySelector('#agenda-automatica [aria-live=polite]')?.textContent?.trim()).toBe(
        'Guardado',
      );
    });

    it('si la anticipacion no es menor que los dias, avisa y no guarda', async () => {
      await cargar();
      const anticipacion = campo('Anticipación');
      anticipacion.value = '14';
      anticipacion.dispatchEvent(new Event('input'));
      await new Promise((listo) => setTimeout(listo, 650));
      await refrescar();

      httpMock.expectNone(`${API}/n-1`);
      expect(el.querySelector('#agenda-automatica')?.textContent).toContain(
        'Tiene que ser menor que los días a crear.',
      );
    });

    it('generar cuenta los turnos libres antes y despues', async () => {
      await cargar();
      botonGenerar().click();
      await refrescar();

      httpMock.expectOne(`${API}/n-1/appointments/public`).flush([{}, {}]);
      await refrescar();
      const generar = httpMock.expectOne(`${API}/n-1/appointment-schedules/generate`);
      expect(generar.request.method).toBe('POST');
      generar.flush(null);
      await refrescar();
      httpMock.expectOne(`${API}/n-1/appointments/public`).flush([{}, {}, {}]);
      httpMock.expectOne(`${API}/mine`).flush({ ...NEGOCIO, scheduleEnd: '2026-11-26T00:00:00' });
      await refrescar();

      expect(el.querySelector('#agenda-automatica [role=status]')?.textContent?.trim()).toBe(
        'Listo, quedaron 3 turnos libres publicados hasta el 26/11 (antes había 2).',
      );
    });

    it('con la agenda apagada no deja generar', async () => {
      await cargar(false);
      expect(botonGenerar().disabled).toBe(true);
      expect(el.querySelector('#agenda-automatica [role=status]')?.textContent?.trim()).toBe(
        'Prendé la agenda automática para generar turnos.',
      );
    });
  });
});
