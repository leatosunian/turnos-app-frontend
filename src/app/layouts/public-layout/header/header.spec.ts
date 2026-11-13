import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RoleName } from '../../../core/models/usuario';
import { AuthService } from '../../../core/services/auth-service';
import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sin sesión Mis turnos sólo se ve en pantallas anchas', () => {
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
    const misTurnos = links.find((a) => a.textContent?.trim() === 'Mis turnos');
    expect(misTurnos?.classList.contains('hidden')).toBe(true);
  });

  it('el link Ingresar lleva a /ingresar', () => {
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
    const ingresar = links.find((a) => a.textContent?.trim() === 'Ingresar');
    expect(ingresar?.getAttribute('href')).toBe('/ingresar');
  });

  it('el botón del celular abre y cierra el menú', () => {
    const pantalla = fixture.nativeElement as HTMLElement;
    const boton = pantalla.querySelector<HTMLButtonElement>(
      'button[aria-controls="menu-publico"]',
    )!;
    expect(pantalla.querySelector('#menu-publico')).toBeNull();

    boton.click();
    fixture.detectChanges();
    expect(pantalla.querySelector('#menu-publico')).not.toBeNull();
    expect(boton.getAttribute('aria-expanded')).toBe('true');

    // tocar una seccion cierra el menu
    pantalla.querySelector<HTMLAnchorElement>('#menu-publico a')!.click();
    fixture.detectChanges();
    expect(pantalla.querySelector('#menu-publico')).toBeNull();
  });

  it('sin sesión no muestra Cerrar sesión', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Cerrar sesión');
  });

  it('las secciones apuntan a las anclas de la landing', () => {
    const hrefs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).map(
      (a) => a.getAttribute('href'),
    );
    expect(hrefs).toContain('/#como');
    expect(hrefs).toContain('/#funciones');
    expect(hrefs).toContain('/#rubros');
  });
});

describe('Header con sesión', () => {
  const cerrarSesion = vi.fn();

  // arma el header con un usuario logueado que tiene los roles indicados
  async function crearFixture(roles: RoleName[], rutaInicial: string) {
    cerrarSesion.mockClear();
    TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            logueado: signal(true),
            rutaInicial: () => rutaInicial,
            tieneRol: (buscados: RoleName[]) => roles.some((rol) => buscados.includes(rol)),
            cerrarSesion,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
    return fixture;
  }

  async function crearConRoles(roles: RoleName[], rutaInicial: string) {
    const fixture = await crearFixture(roles, rutaInicial);
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
  }

  it('un cliente puede cerrar sesión desde el header y desde el menú del celular', async () => {
    const fixture = await crearFixture(['CLIENT'], '/mis-turnos');
    const pantalla = fixture.nativeElement as HTMLElement;
    const botonesSalir = () =>
      Array.from(pantalla.querySelectorAll('button')).filter(
        (b) => b.textContent?.trim() === 'Cerrar sesión',
      );

    botonesSalir()[0].click();
    expect(cerrarSesion).toHaveBeenCalledTimes(1);

    pantalla.querySelector<HTMLButtonElement>('button[aria-controls="menu-publico"]')!.click();
    fixture.detectChanges();
    const enMenu = botonesSalir().find((b) => b.closest('#menu-publico'))!;
    enMenu.click();
    fixture.detectChanges();
    expect(cerrarSesion).toHaveBeenCalledTimes(2);
    expect(pantalla.querySelector('#menu-publico')).toBeNull();
  });

  it('un dueño no ve Mis turnos y su Ingresar lo lleva a /panel', async () => {
    const links = await crearConRoles(['OWNER'], '/panel');
    expect(links.find((a) => a.textContent?.trim() === 'Mis turnos')).toBeUndefined();
    const ingresar = links.find((a) => a.textContent?.trim() === 'Ingresar');
    expect(ingresar?.getAttribute('href')).toBe('/panel');
  });

  it('un cliente ve Mis turnos en todos los tamaños y no ve Ingresar', async () => {
    const links = await crearConRoles(['CLIENT'], '/mis-turnos');
    const misTurnos = links.find((a) => a.textContent?.trim() === 'Mis turnos');
    expect(misTurnos?.classList.contains('hidden')).toBe(false);
    expect(links.find((a) => a.textContent?.trim() === 'Ingresar')).toBeUndefined();
  });

  it('un admin sigue viendo Ingresar, que lo lleva a /admin', async () => {
    const links = await crearConRoles(['ADMIN'], '/admin');
    const ingresar = links.find((a) => a.textContent?.trim() === 'Ingresar');
    expect(ingresar?.getAttribute('href')).toBe('/admin');
  });
});
