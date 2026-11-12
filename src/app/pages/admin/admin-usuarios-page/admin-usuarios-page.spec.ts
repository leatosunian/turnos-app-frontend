import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { errorInterceptor } from '../../../core/interceptors/error-interceptor';
import { RoleName, UserResponse } from '../../../core/models/usuario';
import { AuthService } from '../../../core/services/auth-service';
import { AdminUsuariosPage } from './admin-usuarios-page';

registerLocaleData(localeEsAr);

const URL = `${environment.apiUrl}/admin/users`;

function usuario(
  id: string,
  name: string,
  roles: RoleName[],
  cambios: Partial<UserResponse> = {},
): UserResponse {
  return {
    id,
    name,
    email: `${id}@mail.com`,
    createdAt: '2026-10-20T10:00:00',
    active: true,
    roles,
    ...cambios,
  };
}

const YO = usuario('admin', 'Admin Grupo', ['ADMIN'], { createdAt: '2026-09-01T10:00:00' });
const LUCIA = usuario('lucia', 'Lucía Morales', ['OWNER', 'EMPLOYEE'], {
  createdAt: '2026-10-27T10:00:00',
});
const FEDE = usuario('fede', 'Federico Paz', ['CLIENT'], { createdAt: '2026-10-25T10:00:00' });
const SPAM = usuario('spam', 'cuenta spam', ['CLIENT'], {
  active: false,
  createdAt: '2026-10-24T10:00:00',
});

describe('AdminUsuariosPage', () => {
  let fixture: ComponentFixture<AdminUsuariosPage>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsuariosPage],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-AR' },
        // errorInterceptor también usa AuthService (cerrarSesion)
        { provide: AuthService, useValue: { usuario: signal(YO), cerrarSesion: () => {} } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminUsuariosPage);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function cargar(usuarios = [YO, LUCIA, FEDE, SPAM]): Promise<void> {
    httpMock.expectOne(URL).flush(usuarios);
    await refrescar();
  }

  function nombresVisibles(): string[] {
    return [...el.querySelectorAll('ul button.truncate')].map((b) => b.textContent!.trim());
  }

  function boton(texto: string): HTMLButtonElement {
    return [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)!;
  }

  function filaDe(nombre: string): HTMLElement {
    return [...el.querySelectorAll<HTMLElement>('ul li')].find((li) =>
      li.textContent?.includes(nombre),
    )!;
  }

  function switchDe(nombre: string): HTMLButtonElement {
    return filaDe(nombre).querySelector('button[role="switch"]')!;
  }

  it('lista los usuarios, los más nuevos primero', async () => {
    await cargar();

    expect(nombresVisibles()).toEqual([
      'Lucía Morales',
      'Federico Paz',
      'cuenta spam',
      'Admin Grupo',
    ]);
    expect(el.textContent).toContain('4 usuarios');
  });

  it('busca por nombre o email sin importar tildes', async () => {
    await cargar();
    const buscador = el.querySelector<HTMLInputElement>('input[type="search"]')!;

    buscador.value = 'lucia';
    buscador.dispatchEvent(new Event('input'));
    await refrescar();
    expect(nombresVisibles()).toEqual(['Lucía Morales']);

    buscador.value = 'fede@mail';
    buscador.dispatchEvent(new Event('input'));
    await refrescar();
    expect(nombresVisibles()).toEqual(['Federico Paz']);
  });

  it('filtra por rol y por inactivos', async () => {
    await cargar();

    boton('CLIENT').click();
    await refrescar();
    expect(nombresVisibles()).toEqual(['Federico Paz', 'cuenta spam']);

    boton('Inactivos').click();
    await refrescar();
    expect(nombresVisibles()).toEqual(['cuenta spam']);
  });

  it('pagina de a 8', async () => {
    const muchos = Array.from({ length: 10 }, (_, i) =>
      usuario(`u${i}`, `Usuario ${i}`, ['CLIENT'], {
        createdAt: `2026-10-${String(20 - i).padStart(2, '0')}T10:00:00`,
      }),
    );
    await cargar(muchos);

    expect(nombresVisibles().length).toBe(8);
    expect(el.textContent).toContain('1–8 de 10');

    el.querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')!.click();
    await refrescar();
    expect(nombresVisibles()).toEqual(['Usuario 8', 'Usuario 9']);
    expect(el.textContent).toContain('9–10 de 10');
  });

  it('cambia los roles del usuario elegido', async () => {
    await cargar();
    boton('Federico Paz').click();
    await refrescar();

    const ownerCheckbox = [
      ...el.querySelectorAll<HTMLInputElement>('aside input[type="checkbox"]'),
    ][0];
    ownerCheckbox.click();
    await refrescar();
    boton('Guardar roles').click();

    const req = httpMock.expectOne(`${URL}/fede/roles`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ roles: ['OWNER', 'CLIENT'] });
    req.flush({ ...FEDE, roles: ['OWNER', 'CLIENT'] });
    await refrescar();

    expect(filaDe('Federico Paz').textContent).toContain('OWNER');
  });

  it('no deja guardar sin roles', async () => {
    await cargar();
    boton('Federico Paz').click();
    await refrescar();

    const clientCheckbox = [
      ...el.querySelectorAll<HTMLInputElement>('aside input[type="checkbox"]'),
    ][2];
    clientCheckbox.click();
    await refrescar();

    expect(el.textContent).toContain('Tiene que tener al menos un rol.');
    expect(boton('Guardar roles').disabled).toBe(true);
  });

  it('desactiva una cuenta con el DELETE del back', async () => {
    await cargar();
    switchDe('Federico Paz').click();
    await refrescar();

    const req = httpMock.expectOne(`${URL}/fede`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ ...FEDE, active: false });
    await refrescar();

    expect(switchDe('Federico Paz').getAttribute('aria-checked')).toBe('false');
  });

  it('si el back no deja desactivar, vuelve atrás y muestra el motivo', async () => {
    await cargar();
    switchDe('Federico Paz').click();
    await refrescar();

    httpMock
      .expectOne(`${URL}/fede`)
      .flush(
        { status: 409, message: 'El usuario tiene turnos pendientes' },
        { status: 409, statusText: 'Conflict' },
      );
    await refrescar();

    expect(switchDe('Federico Paz').getAttribute('aria-checked')).toBe('true');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'El usuario tiene turnos pendientes',
    );
  });

  it('no deja desactivar la propia cuenta ni sacarse ADMIN', async () => {
    await cargar();

    expect(switchDe('Admin Grupo').disabled).toBe(true);

    boton('Admin Grupo').click();
    await refrescar();
    const adminCheckbox = [
      ...el.querySelectorAll<HTMLInputElement>('aside input[type="checkbox"]'),
    ][3];
    expect(adminCheckbox.disabled).toBe(true);
  });

  it('eliminar queda deshabilitado como futuro', async () => {
    await cargar();
    boton('Federico Paz').click();
    await refrescar();

    expect(boton('Eliminar usuario').disabled).toBe(true);
  });

  it('si falla la carga permite reintentar', async () => {
    httpMock
      .expectOne(URL)
      .flush({ status: 500, message: 'Error' }, { status: 500, statusText: 'Error' });
    await refrescar();

    expect(el.textContent).toContain('No se pudieron cargar los usuarios');
    boton('Reintentar').click();
    await cargar();
    expect(nombresVisibles().length).toBe(4);
  });
});
