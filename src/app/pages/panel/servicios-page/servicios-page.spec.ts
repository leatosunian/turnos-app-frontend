import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { errorInterceptor } from '../../../core/interceptors/error-interceptor';
import { ServResponse } from '../../../core/models/servicio';
import { UserResponse } from '../../../core/models/usuario';
import { ServiciosPage } from './servicios-page';

registerLocaleData(localeEsAr);

const API = environment.apiUrl;

const CORTE: ServResponse = {
  id: 's-1',
  name: 'Corte clásico',
  durationMinutes: 30,
  price: 9000,
  depositPorcentage: 30,
  businessId: 'n-1',
};

const LUCIA: UserResponse = {
  id: 'e-1',
  name: 'Lucia Morales',
  email: 'lucia@malbec.com',
  createdAt: '2026-01-01T10:00:00',
  active: true,
  roles: ['EMPLOYEE'],
};

describe('ServiciosPage', () => {
  let fixture: ComponentFixture<ServiciosPage>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiciosPage],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ServiciosPage);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function cargar(servicios: ServResponse[], equipo: UserResponse[]): Promise<void> {
    httpMock.expectOne(`${API}/businesses/mine`).flush({ id: 'n-1' });
    httpMock.expectOne(`${API}/businesses/n-1/services`).flush(servicios);
    httpMock.expectOne(`${API}/businesses/n-1/employees`).flush(equipo);
    await refrescar();
  }

  function boton(texto: string): HTMLButtonElement {
    const encontrado = [...el.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === texto,
    );
    if (!encontrado) throw new Error(`No hay un botón "${texto}"`);
    return encontrado;
  }

  function botonPorEtiqueta(etiqueta: string): HTMLButtonElement {
    return el.querySelector(`button[aria-label="${etiqueta}"]`) as HTMLButtonElement;
  }

  async function escribir(etiqueta: string, valor: string): Promise<void> {
    const label = [...el.querySelectorAll('label')].find((l) => l.textContent?.includes(etiqueta))!;
    const input = label.querySelector('input')!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    await refrescar();
  }

  it('lista los servicios con duración, precio y seña, y el equipo', async () => {
    await cargar([CORTE], [LUCIA]);

    expect(el.textContent).toContain('Corte clásico');
    expect(el.textContent).toContain("30'");
    expect(el.textContent).toContain('$9.000');
    expect(el.textContent).toContain('$2.700');
    expect(el.textContent).toContain('Lucia Morales');
    expect(el.textContent).toContain('1 servicio · 1 profesional');
  });

  it('sin servicios muestra el aviso con acceso a crear el primero', async () => {
    await cargar([], []);

    expect(el.textContent).toContain('Todavía no cargaste servicios');
    boton('Crear el primero').click();
    await refrescar();

    expect(el.querySelector('[role="dialog"]')?.textContent).toContain('Nuevo servicio');
  });

  it('sin negocio manda a crearlo', async () => {
    httpMock
      .expectOne(`${API}/businesses/mine`)
      .flush({ status: 404, message: 'No encontrado' }, { status: 404, statusText: 'Not Found' });
    await refrescar();

    expect(el.textContent).toContain('Todavía no creaste tu negocio');
  });

  it('crea un servicio y lo suma a la lista', async () => {
    await cargar([], []);
    boton('Crear el primero').click();
    await refrescar();

    await escribir('Nombre', 'Barba');
    await escribir('Duración', '20');
    await escribir('Precio', '5500');
    expect(el.textContent).toContain('$1.650');

    boton('Crear servicio').click();
    const req = httpMock.expectOne(`${API}/businesses/n-1/services`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Barba',
      durationMinutes: 20,
      price: 5500,
      depositPorcentage: 30,
    });
    req.flush({ ...CORTE, id: 's-2', name: 'Barba', durationMinutes: 20, price: 5500 });
    await refrescar();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(el.textContent).toContain('Barba');
  });

  it('no manda el servicio si faltan datos', async () => {
    await cargar([], []);
    boton('Crear el primero').click();
    await refrescar();

    boton('Crear servicio').click();
    await refrescar();

    httpMock.expectNone(`${API}/businesses/n-1/services`);
    expect(el.textContent).toContain('Ingresá el nombre del servicio.');
  });

  it('edita un servicio desde el menú', async () => {
    await cargar([CORTE], []);
    botonPorEtiqueta('Opciones de Corte clásico').click();
    await refrescar();
    boton('Editar').click();
    await refrescar();

    await escribir('Precio', '10000');
    boton('Guardar cambios').click();

    const req = httpMock.expectOne(`${API}/businesses/n-1/services/s-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.price).toBe(10000);
    req.flush({ ...CORTE, price: 10000 });
    await refrescar();

    expect(el.textContent).toContain('$10.000');
  });

  it('pide confirmación antes de eliminar un servicio', async () => {
    await cargar([CORTE], []);
    botonPorEtiqueta('Opciones de Corte clásico').click();
    await refrescar();
    boton('Eliminar').click();
    await refrescar();

    expect(el.querySelector('[role="alertdialog"]')?.textContent).toContain(
      '¿Eliminar este servicio?',
    );
    httpMock.expectNone(`${API}/businesses/n-1/services/s-1`);

    boton('Eliminar').click();
    httpMock.expectOne(`${API}/businesses/n-1/services/s-1`).flush(null);
    await refrescar();

    expect(el.textContent).not.toContain('Corte clásico');
  });

  it('agrega un profesional con contraseña', async () => {
    await cargar([CORTE], []);
    boton('+ Agregar').click();
    await refrescar();

    await escribir('Nombre y apellido', 'Tomas Rivero');
    await escribir('Email', 'tomas@malbec.com');
    await escribir('Contraseña', 'Clave123');
    boton('Agregar').click();

    const req = httpMock.expectOne(`${API}/businesses/n-1/employees`);
    expect(req.request.body).toEqual({
      name: 'Tomas Rivero',
      email: 'tomas@malbec.com',
      password: 'Clave123',
    });
    req.flush({ ...LUCIA, id: 'e-2', name: 'Tomas Rivero', email: 'tomas@malbec.com' });
    await refrescar();

    expect(el.textContent).toContain('Tomas Rivero');
  });

  it('al editar un profesional la contraseña es opcional y vacía no se manda', async () => {
    await cargar([], [LUCIA]);
    botonPorEtiqueta('Opciones de Lucia Morales').click();
    await refrescar();
    boton('Editar').click();
    await refrescar();

    expect(el.textContent).toContain('Contraseña nueva (opcional)');
    boton('Guardar cambios').click();
    await refrescar();

    const pedido = httpMock.expectOne(`${API}/employees/e-1`);
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toEqual({ name: LUCIA.name, email: LUCIA.email });
    pedido.flush(LUCIA);
  });

  it('si el back no deja quitar al profesional, muestra el motivo', async () => {
    await cargar([], [LUCIA]);
    botonPorEtiqueta('Opciones de Lucia Morales').click();
    await refrescar();
    boton('Quitar del equipo').click();
    await refrescar();

    boton('Quitar').click();
    httpMock
      .expectOne(`${API}/employees/e-1`)
      .flush(
        { status: 409, message: 'El empleado tiene turnos pendientes' },
        { status: 409, statusText: 'Conflict' },
      );
    await refrescar();

    expect(el.querySelector('[role="alertdialog"]')?.textContent).toContain(
      'El empleado tiene turnos pendientes',
    );
    expect(el.textContent).toContain('Lucia Morales');
  });
});
