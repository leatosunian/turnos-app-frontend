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
import { claveDeFecha } from './reserva';

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

const MINUTO = 60 * 1000;

/** Fecha y hora sin zona, como las manda el back, a tantas horas y minutos de ahora. */
function dentroDe(horas: number, minutos = 0): string {
  const fecha = new Date(Date.now() + (horas * 60 + minutos) * MINUTO);
  const dd = (n: number) => String(n).padStart(2, '0');
  return `${claveDeFecha(fecha)}T${dd(fecha.getHours())}:${dd(fecha.getMinutes())}:00`;
}

/** La hora como se ve en el botón del horario: 2030-04-10T11:00:00 es 11:00. */
const hora = (inicio: string) => inicio.slice(11, 16);

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

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  function el(): HTMLElement {
    return harness.routeNativeElement!;
  }

  async function refrescar(): Promise<void> {
    harness.detectChanges();
    await harness.fixture.whenStable();
  }

  async function cargar(libres = LIBRES, negocio = NEGOCIO): Promise<void> {
    httpMock.expectOne(`${API}/businesses/slug/estudio-malbec`).flush(negocio);
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
    // sin seña no hay política de devolución que mostrar
    expect(texto).not.toContain('Cancelación sin costo');
  });

  it('muestra la política de cancelación del negocio', async () => {
    httpMock
      .expectOne(`${API}/businesses/slug/estudio-malbec`)
      .flush({ ...NEGOCIO, cancellationNoticeHours: 48 });
    httpMock.expectOne(`${API}/businesses/n-1/services`).flush([CORTE]);
    await refrescar();
    httpMock.expectOne((r) => r.params.get('serviceId') === 's-1').flush(LIBRES);
    await refrescar();

    expect(el().textContent).toContain('Cancelación sin costo hasta 48 h antes');
  });

  it('un negocio sin política guardada muestra la de siempre, 24 h', async () => {
    await cargar();
    expect(el().textContent).toContain('Cancelación sin costo hasta 24 h antes');
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

  describe('anticipación mínima', () => {
    const CON_2_HORAS = { ...NEGOCIO, minBookingNoticeHours: 2 };

    /** Corre el reloj de la página: Date.now() pasa a devolver tantos minutos más adelante. */
    async function pasan(minutos: number): Promise<void> {
      const ahora = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(ahora + minutos * MINUTO);
      harness.routeDebugElement!.componentInstance['actualizarHora']();
      await refrescar();
    }

    it('avisa en el perfil con cuánta anticipación hay que reservar', async () => {
      await cargar(LIBRES, CON_2_HORAS);
      const texto = el().textContent!.replace(/\s+/g, ' ');

      expect(texto).toContain('Reservas con al menos 2 h de anticipación');
      expect(texto).toContain('pide reservar con al menos 2 horas de anticipación');
    });

    it('sin anticipación (o en negocios de antes) no avisa nada', async () => {
      await cargar(LIBRES, { ...NEGOCIO, minBookingNoticeHours: 0 });

      expect(el().textContent).not.toContain('de anticipación');
    });

    it('no muestra los horarios que empiezan dentro de la anticipación', async () => {
      // el back todavía no filtra (o la PC y el servidor no tienen la misma hora): igual no se ve
      await cargar([libre('t-1', dentroDe(1))], CON_2_HORAS);

      expect(el().textContent).toContain('No hay horarios libres para este servicio');
    });

    it('muestra los horarios que cumplen la anticipación', async () => {
      const enTres = libre('t-3', dentroDe(3));
      await cargar([enTres], CON_2_HORAS);

      expect(boton(hora(enTres.startDatetime))).toBeTruthy();
    });

    it('si el horario elegido queda dentro de la anticipación mientras mira, avisa y no deja reservar', async () => {
      const justo = libre('t-1', dentroDe(2, 5));
      const despues = libre('t-2', dentroDe(2, 50));
      await cargar([justo, despues], CON_2_HORAS);
      boton(hora(justo.startDatetime)).click();
      await refrescar();
      expect(boton('Reservar').disabled).toBe(false);

      await pasan(10);

      const texto = el().textContent!.replace(/\s+/g, ' ');
      expect(texto).toContain('Ese horario ya no se puede reservar');
      expect(texto).toContain('El negocio pide reservar con al menos 2 horas de anticipación');
      expect(() => boton(hora(justo.startDatetime))).toThrow();
      expect(boton(hora(despues.startDatetime))).toBeTruthy();
      expect(boton('Reservar').disabled).toBe(true);
    });

    it('si el back rechaza la reserva por la anticipación, muestra su mensaje y no "se ocupó"', async () => {
      const enTres = libre('t-3', dentroDe(3));
      await cargar([enTres], CON_2_HORAS);
      boton(hora(enTres.startDatetime)).click();
      await escribir('Nombre', 'Federico Paz');
      await escribir('Email', 'fede@mail.com');
      boton('Reservar').click();
      await refrescar();

      // el cliente tardó una hora y media en completar los datos
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 90 * MINUTO);
      httpMock
        .expectOne(`${API}/appointments/t-3/book`)
        .flush(
          {
            message:
              'El turno ya no está disponible: este negocio pide reservar con al menos 2 horas de anticipación.',
          },
          { status: 409, statusText: 'Conflict' },
        );
      httpMock.expectOne((r) => r.url === `${API}/businesses/n-1/appointments/public`).flush([]);
      await refrescar();

      const texto = el().textContent!;
      expect(texto).toContain('Ese horario ya no se puede reservar');
      expect(texto).toContain(
        'El turno ya no está disponible: este negocio pide reservar con al menos 2 horas de anticipación.',
      );
      expect(texto).not.toContain('Ese horario se acaba de ocupar');
      expect(boton('Reservar').disabled).toBe(true);
    });
  });
});
