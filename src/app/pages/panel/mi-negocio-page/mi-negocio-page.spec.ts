import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { errorInterceptor } from '../../../core/interceptors/error-interceptor';
import { BusinessResponse, BusinessTypeResponse } from '../../../core/models/negocio';
import { ServResponse } from '../../../core/models/servicio';
import { DIAS_A_GENERAR, MiNegocioPage } from './mi-negocio-page';

registerLocaleData(localeEsAr);

const API = environment.apiUrl;

const RUBROS: BusinessTypeResponse[] = [
  { id: 'r-pelu', name: 'Peluquería', deleted: false },
  { id: 'r-barba', name: 'Barbería', deleted: false },
  { id: 'r-spa', name: 'Spa', deleted: false },
];

function negocio(cambios: Partial<BusinessResponse> = {}): BusinessResponse {
  return {
    id: 'n-1',
    name: 'Estudio Malbec',
    email: 'hola@malbec.com',
    slug: 'estudio-malbec',
    phone: '1145550182',
    description: 'Cortes y color',
    automaticSchedule: true,
    scheduleEnd: null,
    scheduleDaysToCreate: 15,
    scheduleAnticipation: 2,
    deleted: false,
    ownerId: 'u-1',
    businessTypes: [RUBROS[0]],
    ...cambios,
  };
}

describe('MiNegocioPage', () => {
  let fixture: ComponentFixture<MiNegocioPage>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiNegocioPage],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MiNegocioPage);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  async function cargar(
    respuesta: BusinessResponse | null,
    servicios: ServResponse[] = [],
  ): Promise<void> {
    httpMock.expectOne(`${API}/business-types`).flush(RUBROS);
    const mine = httpMock.expectOne(`${API}/businesses/mine`);
    if (respuesta) {
      mine.flush(respuesta);
      httpMock.expectOne(`${API}/businesses/${respuesta.id}/services`).flush(servicios);
    } else {
      mine.flush(
        { status: 404, message: 'No encontrado' },
        { status: 404, statusText: 'Not Found' },
      );
    }
    await refrescar();
  }

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function input(nombre: string): HTMLInputElement {
    return el.querySelector(`[formControlName="${nombre}"]`) as HTMLInputElement;
  }

  async function escribir(nombre: string, valor: string): Promise<void> {
    const campo = input(nombre);
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
    await refrescar();
  }

  function boton(texto: string): HTMLButtonElement | undefined {
    return [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);
  }

  function chip(nombre: string): HTMLButtonElement {
    return [...el.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find((b) =>
      b.textContent?.includes(nombre),
    )!;
  }

  it('carga los datos del negocio y marca sus rubros', async () => {
    await cargar(negocio());

    expect(input('nombre').value).toBe('Estudio Malbec');
    expect(input('slug').value).toBe('estudio-malbec');
    expect(chip('Peluquería').getAttribute('aria-pressed')).toBe('true');
    expect(chip('Spa').getAttribute('aria-pressed')).toBe('false');
  });

  it('muestra la barra de guardar sólo cuando hay cambios', async () => {
    await cargar(negocio());
    expect(el.textContent).not.toContain('Cambios sin guardar');

    await escribir('nombre', 'Estudio Malbec Palermo');
    expect(el.textContent).toContain('Cambios sin guardar');

    await escribir('nombre', 'Estudio Malbec');
    expect(el.textContent).not.toContain('Cambios sin guardar');
  });

  it('el teléfono con espacios no cuenta como cambio', async () => {
    await cargar(negocio());
    await escribir('telefono', '11 4555 0182');

    expect(el.textContent).not.toContain('Cambios sin guardar');
  });

  it('descartar vuelve a los datos guardados', async () => {
    await cargar(negocio());
    await escribir('nombre', 'Otro nombre');
    chip('Spa').click();
    await refrescar();

    boton('Descartar')!.click();
    await refrescar();

    expect(input('nombre').value).toBe('Estudio Malbec');
    expect(chip('Spa').getAttribute('aria-pressed')).toBe('false');
    expect(el.textContent).not.toContain('Cambios sin guardar');
  });

  it('no acepta slugs reservados ni con formato inválido', async () => {
    await cargar(negocio());

    await escribir('slug', 'panel');
    expect(el.textContent).toContain('Esa dirección está reservada');

    await escribir('slug', 'Estudio Malbec');
    expect(el.textContent).toContain('Usá solo minúsculas, números y guiones');
  });

  it('guarda con PUT completo, sin espacios en el teléfono, y sincroniza los rubros', async () => {
    await cargar(negocio());
    await escribir('telefono', '11 4555 0199');
    chip('Peluquería').click();
    chip('Spa').click();
    await refrescar();

    boton('Guardar')!.click();

    const put = httpMock.expectOne(`${API}/businesses/n-1`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({
      name: 'Estudio Malbec',
      slug: 'estudio-malbec',
      email: 'hola@malbec.com',
      phone: '1145550199',
      description: 'Cortes y color',
      automaticSchedule: true,
      scheduleEnd: null,
      scheduleDaysToCreate: 15,
      scheduleAnticipation: 2,
    });
    put.flush(negocio({ phone: '1145550199' }));

    httpMock
      .expectOne((r) => r.method === 'POST' && r.url === `${API}/businesses/n-1/types/r-spa`)
      .flush(negocio({ phone: '1145550199', businessTypes: [RUBROS[0], RUBROS[2]] }));
    httpMock
      .expectOne((r) => r.method === 'DELETE' && r.url === `${API}/businesses/n-1/types/r-pelu`)
      .flush(negocio({ phone: '1145550199', businessTypes: [RUBROS[2]] }));
    await refrescar();

    expect(input('telefono').value).toBe('1145550199');
    expect(el.textContent).not.toContain('Cambios sin guardar');
  });

  it('si sólo cambian los rubros no hace el PUT', async () => {
    await cargar(negocio());
    chip('Spa').click();
    await refrescar();

    boton('Guardar')!.click();

    httpMock.expectNone(`${API}/businesses/n-1`);
    httpMock
      .expectOne(`${API}/businesses/n-1/types/r-spa`)
      .flush(negocio({ businessTypes: [RUBROS[0], RUBROS[2]] }));
  });

  it('muestra el error del back al guardar', async () => {
    await cargar(negocio());
    await escribir('slug', 'otro-slug');

    boton('Guardar')!.click();
    httpMock
      .expectOne(`${API}/businesses/n-1`)
      .flush(
        { status: 409, message: 'slug: Ya existe un negocio con ese slug' },
        { status: 409, statusText: 'Conflict' },
      );
    await refrescar();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Ya existe un negocio con ese slug',
    );
    expect(el.textContent).toContain('Cambios sin guardar');
  });

  describe('sin negocio', () => {
    it('muestra el formulario para crearlo, sin dar de baja', async () => {
      await cargar(null);

      expect(boton('Crear negocio')).toBeTruthy();
      expect(el.textContent).not.toContain('Dar de baja');
    });

    it('crea el negocio con los días a generar y le asigna los rubros', async () => {
      await cargar(null);
      await escribir('nombre', 'Estudio Malbec');
      await escribir('slug', 'estudio-malbec');
      await escribir('email', 'hola@malbec.com');
      await escribir('telefono', '11 4555 0182');
      chip('Barbería').click();
      await refrescar();

      boton('Crear negocio')!.click();

      const post = httpMock.expectOne(`${API}/businesses`);
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual({
        name: 'Estudio Malbec',
        slug: 'estudio-malbec',
        email: 'hola@malbec.com',
        phone: '1145550182',
        description: '',
        scheduleDaysToCreate: DIAS_A_GENERAR,
      });
      post.flush(negocio({ businessTypes: [] }));

      httpMock
        .expectOne(`${API}/businesses/n-1/types/r-barba`)
        .flush(negocio({ businessTypes: [RUBROS[1]] }));
      await refrescar();

      expect(boton('Crear negocio')).toBeUndefined();
      expect(el.textContent).toContain('Dar de baja');
    });

    it('no manda nada si faltan datos', async () => {
      await cargar(null);
      boton('Crear negocio')!.click();
      await refrescar();

      httpMock.expectNone(`${API}/businesses`);
      expect(el.textContent).toContain('Ingresá el nombre del negocio.');
    });
  });

  it('si falla la carga muestra el error y permite reintentar', async () => {
    httpMock.expectOne(`${API}/business-types`).flush(RUBROS);
    httpMock
      .expectOne(`${API}/businesses/mine`)
      .flush({ status: 500, message: 'Error' }, { status: 500, statusText: 'Error' });
    await refrescar();

    expect(el.textContent).toContain('No se pudo cargar tu negocio');

    boton('Reintentar')!.click();
    await cargar(negocio());
    expect(input('nombre').value).toBe('Estudio Malbec');
  });

  describe('vista previa', () => {
    function servicio(id: string, name: string, price: number): ServResponse {
      return { id, name, price, durationMinutes: 30, depositPorcentage: 30, businessId: 'n-1' };
    }

    function vistaPrevia(): string {
      return el.querySelector('aside[aria-label="Vista previa"]')?.textContent ?? '';
    }

    it('muestra los primeros servicios con su precio', async () => {
      await cargar(negocio(), [
        servicio('s-1', 'Corte clásico', 9000),
        servicio('s-2', 'Corte + barba', 12500),
        servicio('s-3', 'Barba', 5500),
      ]);

      expect(vistaPrevia()).toContain('Corte clásico');
      expect(vistaPrevia()).toContain('$9.000');
      expect(vistaPrevia()).toContain('$12.500');
      expect(vistaPrevia()).not.toContain('Barba');
      expect(vistaPrevia()).toContain('+ 1 más');
    });

    it('sin servicios invita a cargarlos', async () => {
      await cargar(negocio(), []);

      const link = el.querySelector('aside a[href="/panel/servicios"]');
      expect(link?.textContent).toContain('Cargar servicios');
    });

    it('si fallan los servicios, la pantalla se muestra igual', async () => {
      httpMock.expectOne(`${API}/business-types`).flush(RUBROS);
      httpMock.expectOne(`${API}/businesses/mine`).flush(negocio());
      httpMock
        .expectOne(`${API}/businesses/n-1/services`)
        .flush({ status: 500, message: 'Error' }, { status: 500, statusText: 'Error' });
      await refrescar();

      expect(input('nombre').value).toBe('Estudio Malbec');
      expect(vistaPrevia()).not.toContain('Cargar servicios');
    });
  });
});
