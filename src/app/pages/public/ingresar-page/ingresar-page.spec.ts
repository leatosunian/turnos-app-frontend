import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { UserResponse } from '../../../core/models/usuario';
import { AuthService } from '../../../core/services/auth-service';
import { IngresarPage } from './ingresar-page';

const USUARIO = { id: 'u-1', name: 'Ana', roles: ['OWNER'] } as UserResponse;

describe('IngresarPage', () => {
  let harness: RouterTestingHarness;
  let auth: {
    login: ReturnType<typeof vi.fn>;
    registrar: ReturnType<typeof vi.fn>;
    registrarCliente: ReturnType<typeof vi.fn>;
    redirigirSegunRol: ReturnType<typeof vi.fn>;
  };

  const pagina = () => harness.routeNativeElement as HTMLElement;
  const buscar = <T extends HTMLElement>(selector: string) => pagina().querySelector(selector) as T;
  const botonEnviar = () => buscar<HTMLButtonElement>('button[type="submit"]');

  async function abrir(url = '/ingresar'): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, IngresarPage);
  }

  async function escribir(selector: string, valor: string): Promise<void> {
    const input = buscar<HTMLInputElement>(selector);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
  }

  async function enviar(): Promise<void> {
    botonEnviar().click();
    await harness.fixture.whenStable();
  }

  beforeEach(() => {
    auth = {
      login: vi.fn(() => of(USUARIO)),
      registrar: vi.fn(() => of(USUARIO)),
      registrarCliente: vi.fn(() => of(USUARIO)),
      redirigirSegunRol: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'ingresar', component: IngresarPage }]),
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  it('arranca en la pestaña Ingresar', async () => {
    await abrir();
    expect(buscar('#tab-ingresar').getAttribute('aria-selected')).toBe('true');
    expect(buscar('h1').textContent).toContain('Hola de nuevo');
  });

  it('con ?modo=crear abre la pestaña Crear cuenta', async () => {
    await abrir('/ingresar?modo=crear');
    expect(buscar('#tab-crear').getAttribute('aria-selected')).toBe('true');
    expect(botonEnviar().textContent).toContain('Crear cuenta y configurar mi negocio');
  });

  it('cambiar de pestaña actualiza la URL', async () => {
    await abrir();
    buscar<HTMLButtonElement>('#tab-crear').click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/ingresar?modo=crear');
    expect(buscar('h1').textContent).toContain('Empezá en dos minutos');
  });

  it('no manda el login si faltan datos y marca los campos', async () => {
    await abrir();
    await enviar();

    expect(auth.login).not.toHaveBeenCalled();
    expect(pagina().textContent).toContain('Ingresá tu email.');
    expect(pagina().textContent).toContain('Ingresá tu contraseña.');
  });

  it('ingresa y redirige según el rol', async () => {
    await abrir();
    await escribir('input[type="email"]', 'ana@mail.com');
    await escribir('input[type="password"]', 'Clave123');
    await enviar();

    expect(auth.login).toHaveBeenCalledWith({ email: 'ana@mail.com', password: 'Clave123' });
    expect(auth.redirigirSegunRol).toHaveBeenCalled();
  });

  it('si el login falla muestra un mensaje en castellano', async () => {
    auth.login.mockReturnValue(
      throwError(() => ({ status: 401, message: 'Invalid email or password' })),
    );
    await abrir();
    await escribir('input[type="email"]', 'ana@mail.com');
    await escribir('input[type="password"]', 'otra');
    await enviar();

    expect(buscar('[role="alert"]').textContent).toContain(
      'El email o la contraseña no son correctos.',
    );
    expect(auth.redirigirSegunRol).not.toHaveBeenCalled();
    expect(botonEnviar().disabled).toBe(false);
  });

  it('pide una contraseña de 8 caracteres con mayúscula, minúscula y número', async () => {
    await abrir('/ingresar?modo=crear');
    await escribir('input[type="password"]', 'corta');
    await enviar();
    expect(pagina().textContent).toContain('Tiene que tener al menos 8 caracteres.');

    await escribir('input[type="password"]', 'sinnumeros');
    expect(pagina().textContent).toContain('una mayúscula, una minúscula y un número');
    expect(auth.registrar).not.toHaveBeenCalled();
  });

  it('registra un negocio como OWNER', async () => {
    await abrir('/ingresar?modo=crear');
    await escribir('input[autocomplete="name"]', 'Lucia Morales ');
    await escribir('input[type="email"]', 'lucia@mail.com');
    await escribir('input[type="password"]', 'Clave123');
    await enviar();

    expect(auth.registrar).toHaveBeenCalledWith({
      name: 'Lucia Morales',
      email: 'lucia@mail.com',
      password: 'Clave123',
    });
    expect(auth.registrarCliente).not.toHaveBeenCalled();
    expect(auth.redirigirSegunRol).toHaveBeenCalled();
  });

  it('con "Quiero reservar" registra un cliente', async () => {
    await abrir('/ingresar?modo=crear');
    buscar<HTMLInputElement>('input[value="cliente"]').click();
    await harness.fixture.whenStable();
    expect(botonEnviar().textContent?.trim()).toBe('Crear cuenta');

    await escribir('input[autocomplete="name"]', 'Lucia Morales');
    await escribir('input[type="email"]', 'lucia@mail.com');
    await escribir('input[type="password"]', 'Clave123');
    await enviar();

    expect(auth.registrarCliente).toHaveBeenCalled();
    expect(auth.registrar).not.toHaveBeenCalled();
  });

  it('muestra el error del back sin el nombre del campo', async () => {
    auth.registrar.mockReturnValue(
      throwError(() => ({ status: 400, message: 'email: El email no es válido' })),
    );
    await abrir('/ingresar?modo=crear');
    await escribir('input[autocomplete="name"]', 'Lucia Morales');
    await escribir('input[type="email"]', 'lucia@mail');
    await escribir('input[type="password"]', 'Clave123');
    await enviar();

    expect(buscar('[role="alert"]').textContent?.trim()).toBe('El email no es válido');
  });

  it('muestra el error de email repetido', async () => {
    auth.registrar.mockReturnValue(
      throwError(() => ({ status: 409, message: 'El email ya está en uso' })),
    );
    await abrir('/ingresar?modo=crear');
    await escribir('input[autocomplete="name"]', 'Lucia Morales');
    await escribir('input[type="email"]', 'lucia@mail.com');
    await escribir('input[type="password"]', 'Clave123');
    await enviar();

    expect(buscar('[role="alert"]').textContent).toContain('El email ya está en uso');
  });

  it('recuperar contraseña está deshabilitado y marcado como Futuro', async () => {
    await abrir();
    const recuperar = Array.from(pagina().querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Restablecer contraseña'),
    );
    expect(recuperar?.disabled).toBe(true);
    expect(pagina().textContent).toContain('Futuro');
  });
});
