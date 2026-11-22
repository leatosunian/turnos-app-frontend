import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { BusinessResponse } from '../../../core/models/negocio';
import { RoleName } from '../../../core/models/usuario';
import { AppointmentService } from '../../../core/services/appointment-service';
import { AuthService } from '../../../core/services/auth-service';
import { NegocioService } from '../../../core/services/negocio-service';
import { MenuMas } from './menu-mas';

const NEGOCIO = { id: 'n-1', name: 'Estudio Malbec', slug: 'estudio-malbec' } as BusinessResponse;

describe('MenuMas', () => {
  let fixture: ComponentFixture<MenuMas>;
  let miNegocio: ReturnType<typeof vi.fn<() => Observable<BusinessResponse>>>;
  let cerrarSesion: ReturnType<typeof vi.fn>;
  let contar: ReturnType<typeof vi.fn<() => Observable<number>>>;

  async function crear(roles: RoleName[], respuesta: Observable<BusinessResponse>, sinSena = 0) {
    miNegocio = vi.fn(() => respuesta);
    cerrarSesion = vi.fn();
    contar = vi.fn(() => of(sinSena));
    await TestBed.configureTestingModule({
      imports: [MenuMas],
      providers: [
        provideRouter([]),
        { provide: NegocioService, useValue: { miNegocio } },
        { provide: AppointmentService, useValue: { contar } },
        {
          provide: AuthService,
          useValue: {
            tieneRol: (buscados: RoleName[]) => roles.some((rol) => buscados.includes(rol)),
            usuario: () => ({ name: 'Ana Pérez', roles }),
            cerrarSesion,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuMas);
    await fixture.whenStable();
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function botones(): HTMLButtonElement[] {
    return Array.from(el().querySelectorAll('button'));
  }

  it('el dueño ve los accesos y el link público de su negocio', async () => {
    await crear(['OWNER'], of(NEGOCIO));

    const accesos = Array.from(el().querySelectorAll('nav a'), (a) => a.getAttribute('href'));
    expect(accesos).toEqual([
      '/panel/turnos',
      '/panel/servicios',
      '/panel/horarios',
      '/panel/negocio',
    ]);
    expect(el().textContent).toContain('Estudio Malbec');
    expect(el().textContent).toContain('/estudio-malbec');

    const abrir = el().querySelector<HTMLAnchorElement>('a[target="_blank"]');
    expect(abrir?.href).toBe(`${location.origin}/estudio-malbec`);
  });

  it('la fila Turnos muestra cuántos esperan seña', async () => {
    await crear(['OWNER'], of(NEGOCIO), 4);

    expect(contar).toHaveBeenCalledWith('n-1', 'AWAITING_PAYMENT');
    expect(el().querySelector('nav a')?.textContent).toContain('4 sin seña');
  });

  it('sin turnos esperando seña no muestra la pastilla', async () => {
    await crear(['OWNER'], of(NEGOCIO));

    expect(el().textContent).not.toContain('sin seña');
  });

  it('copia el link al portapapeles', async () => {
    await crear(['OWNER'], of(NEGOCIO));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    botones()
      .find((b) => b.getAttribute('aria-label') === 'Copiar link')!
      .click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith(`${location.origin}/estudio-malbec`);
    expect(el().textContent).toContain('Link copiado.');
  });

  it('si el dueño no tiene negocio, muestra el aviso para crearlo', async () => {
    await crear(
      ['OWNER'],
      throwError(() => ({ status: 404, message: 'Negocio no encontrado' }) as ApiError),
    );

    expect(el().textContent).toContain('Todavía no creaste tu negocio');
    expect(el().querySelector('a[href="/panel/negocio"]')).toBeTruthy();
    expect(el().querySelector('a[target="_blank"]')).toBeNull();
  });

  it('si falla la carga, muestra el error y deja reintentar', async () => {
    await crear(
      ['OWNER'],
      throwError(() => ({ status: 0, message: 'Sin conexión' }) as ApiError),
    );
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Sin conexión');

    miNegocio.mockReturnValue(of(NEGOCIO));
    botones()
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    await fixture.whenStable();

    expect(miNegocio).toHaveBeenCalledTimes(2);
    expect(el().textContent).toContain('/estudio-malbec');
  });

  it('el empleado solo ve cerrar sesión y no pide el negocio', async () => {
    await crear(['EMPLOYEE'], of(NEGOCIO));

    expect(miNegocio).not.toHaveBeenCalled();
    expect(el().querySelector('nav')).toBeNull();
    expect(botones().map((b) => b.textContent?.trim())).toEqual(['Cerrar sesión']);
  });

  it('cerrar sesión llama al servicio de auth', async () => {
    await crear(['OWNER'], of(NEGOCIO));

    botones()
      .find((b) => b.textContent?.includes('Cerrar sesión'))!
      .click();

    expect(cerrarSesion).toHaveBeenCalled();
  });
});
