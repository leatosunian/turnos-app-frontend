import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { errorInterceptor } from '../../../core/interceptors/error-interceptor';
import { BusinessResponse } from '../../../core/models/negocio';
import { ServResponse } from '../../../core/models/servicio';
import { AppointmentResponse } from '../../../core/models/turno';
import { NegocioPage } from './negocio-page';

registerLocaleData(localeEsAr);

const API = environment.apiUrl;

const NEGOCIO = {
  id: 'n-1',
  name: 'Estudio Malbec',
  slug: 'estudio-malbec',
  email: 'hola@malbec.com',
  phone: '1145550182',
  description: null,
  businessTypes: [{ id: 'r-1', name: 'PELUQUERIA', deleted: false }],
} as unknown as BusinessResponse;

const CORTE: ServResponse = {
  id: 's-1',
  name: 'Corte + barba',
  durationMinutes: 45,
  price: 12500,
  depositPorcentage: 30,
  businessId: 'n-1',
};

function libre(id: string, inicio: string): AppointmentResponse {
  return {
    id,
    startDatetime: inicio,
    status: 'UNBOOKED',
    price: 12500,
    employeeName: 'Tomás',
  } as AppointmentResponse;
}

const LIBRES = [libre('t-1', '2030-04-10T11:00:00'), libre('t-2', '2030-04-10T15:00:00')];

@Component({ template: '' })
class PagoFalso {}

describe('NegocioPage', () => {
  let harness: RouterTestingHarness;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'reserva/:id', component: PagoFalso },
          { path: ':slug', component: NegocioPage },
        ]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/estudio-malbec');
  });

  afterEach(() => httpMock.verify());

  function el(): HTMLElement {
    return harness.routeNativeElement!;
  }

  async function refrescar(): Promise<void> {
    harness.detectChanges();
    await harness.fixture.whenStable();
  }

  async function cargar(libres = LIBRES): Promise<void> {
    httpMock.expectOne(`${API}/businesses/slug/estudio-malbec`).flush(NEGOCIO);
    httpMock.expectOne(`${API}/businesses/n-1/services`).flush([CORTE]);
    await refrescar();
    httpMock.expectOne((r) => r.url === `${API}/businesses/n-1/appointments/public`).flush(libres);
    await refrescar();
  }

  function boton(texto: string): HTMLButtonElement {
    const encontrado = [...el().querySelectorAll('button')].find((b) =>
      b.textContent?.replace(/\s+/g, ' ').trim().startsWith(texto),
    );
    if (!encontrado) throw new Error(`No hay un botón "${texto}"`);
    return encontrado;
  }

  async function escribir(etiqueta: string, valor: string): Promise<void> {
    const label = [...el().querySelectorAll('label')].find((l) =>
      l.textContent?.includes(etiqueta),
    );
    const input = label!.querySelector('input')!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    await refrescar();
  }

  it('muestra el negocio, sus rubros, la seña y los servicios', async () => {
    await cargar();
    const texto = el().textContent!;

    expect(el().querySelector('h1')?.textContent).toContain('Estudio Malbec');
    expect(texto).toContain('Peluquería');
    expect(texto).toContain('1145550182');
    expect(texto).toContain('Seña del 30%');
    expect(texto).toContain('$12.500');
    expect(texto).toContain('45 min');
  });

  it('la seña de la cabecera sigue al servicio elegido', async () => {
    const barba: ServResponse = {
      ...CORTE,
      id: 's-2',
      name: 'Barba',
      price: 5500,
      depositPorcentage: 50,
    };
    httpMock.expectOne(`${API}/businesses/slug/estudio-malbec`).flush(NEGOCIO);
    httpMock.expectOne(`${API}/businesses/n-1/services`).flush([CORTE, barba]);
    await refrescar();
    httpMock.expectOne((r) => r.params.get('serviceId') === 's-1').flush(LIBRES);
    await refrescar();

    const sena = () => el().querySelector('header li')?.textContent?.replace(/\s+/g, ' ').trim();
    expect(sena()).toBe('Seña del 30% · $3.750');

    boton('Barba').click();
    await refrescar();
    httpMock.expectOne((r) => r.params.get('serviceId') === 's-2').flush([]);
    await refrescar();

    expect(sena()).toBe('Seña del 50% · $2.750');
  });

  it('un servicio con seña del 0 % no habla de pagar', async () => {
    const sinSena: ServResponse = { ...CORTE, depositPorcentage: 0 };
    httpMock.expectOne(`${API}/businesses/slug/estudio-malbec`).flush(NEGOCIO);
    httpMock.expectOne(`${API}/businesses/n-1/services`).flush([sinSena]);
    await refrescar();
    httpMock.expectOne((r) => r.params.get('serviceId') === 's-1').flush(LIBRES);
    await refrescar();

    const texto = el().textContent!.replace(/\s+/g, ' ');
    expect(el().querySelector('header li')?.textContent?.trim()).toBe('Sin seña');
    expect(texto).not.toContain('Reservar y pagar seña');
    expect(texto).not.toContain('Tenés 30 minutos');
    expect(texto).toContain('el turno queda confirmado al reservar');
  });

  it('elige el primer día con horarios libres y los separa en mañana y tarde', async () => {
    await cargar();
    const texto = el().textContent!;

    expect(texto).toContain('Abril 2030');
    expect(texto).toContain('2 horarios libres');
    expect(texto).toContain('Mañana');
    expect(texto).toContain('Tarde');
    expect(boton('11:00')).toBeTruthy();
  });

  it('si el slug no existe muestra la página de no encontrado', async () => {
    httpMock
      .expectOne(`${API}/businesses/slug/estudio-malbec`)
      .flush({ message: 'Business not found' }, { status: 404, statusText: 'Not Found' });
    await refrescar();

    expect(el().querySelector('app-no-encontrado-page')).not.toBeNull();
  });

  it('no deja reservar sin nombre ni email', async () => {
    await cargar();
    boton('11:00').click();
    await refrescar();
    boton('Reservar').click();
    await refrescar();

    expect(el().textContent).toContain('Ingresá tu nombre y apellido.');
    httpMock.expectNone(`${API}/appointments/t-1/book`);
  });

  it('reserva el turno y va al pago de la seña con el turno', async () => {
    await cargar();
    boton('11:00').click();
    await refrescar();
    expect(el().textContent).toContain('$3.750');

    await escribir('Nombre', 'Federico Paz');
    await escribir('Email', 'fede@mail.com');
    boton('Reservar').click();
    await refrescar();

    const req = httpMock.expectOne(`${API}/appointments/t-1/book`);
    expect(req.request.body).toEqual({
      clientName: 'Federico Paz',
      clientEmail: 'fede@mail.com',
      clientPhone: undefined,
    });
    req.flush({ ...LIBRES[0], status: 'AWAITING_PAYMENT' });
    await refrescar();

    const router = TestBed.inject(Router);
    expect(router.url).toBe('/reserva/t-1');
    const state = router.lastSuccessfulNavigation()?.extras.state;
    expect(state?.['turno'].status).toBe('AWAITING_PAYMENT');
    expect(state?.['negocio']).toEqual({ name: NEGOCIO.name, slug: NEGOCIO.slug });
    expect(Number.isNaN(Date.parse(state?.['reservadaEn']))).toBe(false);
  });

  it('si el horario se ocupó, avisa y deja elegir otro', async () => {
    await cargar();
    boton('11:00').click();
    await escribir('Nombre', 'Federico Paz');
    await escribir('Email', 'fede@mail.com');
    boton('Reservar').click();
    await refrescar();

    httpMock
      .expectOne(`${API}/appointments/t-1/book`)
      .flush(
        { message: 'El turno ya no está disponible.' },
        { status: 409, statusText: 'Conflict' },
      );
    httpMock
      .expectOne((r) => r.url === `${API}/businesses/n-1/appointments/public`)
      .flush([LIBRES[1]]);
    await refrescar();

    expect(el().textContent).toContain('Ese horario se acaba de ocupar');
    expect(() => boton('11:00')).toThrow();
    expect(boton('Reservar').disabled).toBe(true);
  });

  it('si el día elegido se queda sin horarios, pasa al siguiente con lugar y no al primero', async () => {
    const dia3 = libre('t-3', '2030-04-03T09:00:00');
    const dia10 = libre('t-10', '2030-04-10T11:00:00');
    const dia24 = libre('t-24', '2030-04-24T15:30:00');
    await cargar([dia3, dia10, dia24]);
    // los botones del calendario: tienen aria-pressed y solo el número del día
    const dias = () =>
      [...el().querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].filter((b) =>
        /^\d+$/.test(b.textContent!.trim()),
      );
    const diaElegido = () => dias().find((b) => b.getAttribute('aria-pressed') === 'true');
    dias()
      .find((b) => b.textContent?.trim() === '10')!
      .click();
    await refrescar();

    boton('11:00').click();
    await escribir('Nombre', 'Federico Paz');
    await escribir('Email', 'fede@mail.com');
    boton('Reservar').click();
    await refrescar();
    httpMock
      .expectOne(`${API}/appointments/t-10/book`)
      .flush(
        { message: 'El turno ya no está disponible.' },
        { status: 409, statusText: 'Conflict' },
      );
    httpMock
      .expectOne((r) => r.url === `${API}/businesses/n-1/appointments/public`)
      .flush([dia3, dia24]);
    await refrescar();

    expect(el().textContent).toContain('Ese horario se acaba de ocupar');
    expect(diaElegido()?.textContent?.trim()).toBe('24');
    expect(boton('15:30')).toBeTruthy();
  });
});
