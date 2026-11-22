import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { errorInterceptor } from '../../../../core/interceptors/error-interceptor';
import { DayScheduleResponse, DiaSemana } from '../../../../core/models/horario';
import { FinDeLote, LoteDialogo } from './lote-dialogo';

registerLocaleData(localeEsAr);

const URL = `${environment.apiUrl}/businesses/n-1/appointment-schedules`;

function dia(day: DiaSemana, desde: string | null, hasta: string | null): DayScheduleResponse {
  return {
    id: `d-${day}`,
    day,
    dayStart: desde,
    dayEnd: hasta,
    appointmentDuration: 45,
    enabled: desde !== null,
    businessId: 'n-1',
  };
}

// el lunes abre de 10 a 12, el martes esta cerrado y el miercoles abre recien a las 10:30
const SEMANA = [
  dia('LUN', '10:00:00', '12:00:00'),
  dia('MAR', null, null),
  dia('MIE', '10:30:00', '12:00:00'),
  dia('JUE', null, null),
  dia('VIE', null, null),
  dia('SAB', null, null),
  dia('DOM', null, null),
];

describe('LoteDialogo', () => {
  let fixture: ComponentFixture<LoteDialogo>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;
  let fin: FinDeLote | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoteDialogo],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoteDialogo);
    fixture.componentRef.setInput('businessId', 'n-1');
    fixture.componentRef.setInput('semana', SEMANA);
    fixture.componentRef.setInput('servicios', [
      { id: 's-1', name: 'Corte de pelo', durationMinutes: 45, price: 12000 },
    ]);
    fixture.componentRef.setInput('equipo', [{ id: 'e-1', name: 'Lucia Gomez' }]);
    // ya hay un Corte con Lucia el lunes a las 10
    fixture.componentRef.setInput('plantilla', [
      {
        id: 't-1',
        dayNumber: 0,
        startTime: '10:00:00',
        endTime: '10:45:00',
        price: 12000,
        businessId: 'n-1',
        serviceId: 's-1',
        employeeId: 'e-1',
      },
    ]);
    fixture.componentRef.setInput('diaInicial', 0);
    fin = null;
    fixture.componentInstance.terminado.subscribe((valor) => (fin = valor));
    el = fixture.nativeElement;
    await refrescar();
  });

  afterEach(() => httpMock.verify());

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const boton = (texto: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.trim().startsWith(texto),
    )!;
  const vistaPrevia = () => el.querySelector('[aria-live=polite]')?.textContent ?? '';

  async function elegirProfesional(id: string): Promise<void> {
    const select = [...el.querySelectorAll('label')]
      .find((l) => l.textContent?.includes('Profesional'))!
      .querySelector('select')!;
    select.value = id;
    select.dispatchEvent(new Event('change'));
    await refrescar();
  }

  it('arranca con el dia que se estaba mirando y su horario', () => {
    expect(boton('Lun').getAttribute('aria-pressed')).toBe('true');
    expect(boton('Mar').disabled).toBe(true);
    expect(boton('Mar').textContent?.trim()).toBe('Mar · cerrado');
    expect(vistaPrevia()).toContain('10:00');
    expect(vistaPrevia()).toContain('10:45');
    expect(vistaPrevia()).toContain('Se van a crear 2 turnos programados el lunes.');
    expect(boton('Crear').textContent?.trim()).toBe('Crear 2 turnos');
  });

  it('saltea los que chocan con un turno del mismo profesional', async () => {
    await elegirProfesional('e-1');
    expect(vistaPrevia()).toContain(
      '1 choca con otro turno de Lucia Gomez y se va a saltear: lun 10:00.',
    );
    expect(boton('Crear').textContent?.trim()).toBe('Crear 1 turno');
  });

  it('saltea los que quedan fuera del horario de su dia', async () => {
    boton('Mié').click();
    await refrescar();
    expect(vistaPrevia()).toContain(
      'Se van a crear 4 turnos programados: 2 por día en lunes y miércoles.',
    );
    expect(vistaPrevia()).toContain(
      '1 queda fuera del horario de su día y se va a saltear: mié 10:00.',
    );
    expect(boton('Crear').textContent?.trim()).toBe('Crear 3 turnos');
  });

  it('sin dias elegidos no deja crear', async () => {
    boton('Lun').click();
    await refrescar();
    expect(vistaPrevia()).toContain('Elegí al menos un día.');
    expect(boton('Crear').disabled).toBe(true);
  });

  it('manda los POST de a uno y si uno falla sigue con el resto', async () => {
    boton('Crear').click();
    await refrescar();

    // solo hay un pedido en vuelo: el segundo sale cuando vuelve el primero
    const primero = httpMock.expectOne(URL);
    expect(primero.request.body).toEqual({
      dayNumber: 0,
      startTime: '10:00',
      endTime: '10:45',
      serviceId: 's-1',
      employeeId: null,
    });
    primero.flush({ id: 't-2', ...primero.request.body, price: 12000, businessId: 'n-1' });
    await refrescar();
    expect(el.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('1');

    httpMock
      .expectOne(URL)
      .flush({ status: 409, message: 'Choca' }, { status: 409, statusText: 'Conflict' });
    await refrescar();

    expect(fin?.creados.map((t) => t.id)).toEqual(['t-2']);
    expect(fin?.resultado).toEqual({ creados: 1, choques: 0, fueraDeHorario: 0, fallidos: 1 });
  });
});
