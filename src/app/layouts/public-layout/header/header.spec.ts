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
  // arma el header con un usuario logueado que tiene los roles indicados
  async function crearConRoles(roles: RoleName[], rutaInicial: string) {
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
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
  }

  it('un dueño no ve Mis turnos y su Ingresar lo lleva a /panel', async () => {
    const links = await crearConRoles(['OWNER'], '/panel');
    expect(links.find((a) => a.textContent?.trim() === 'Mis turnos')).toBeUndefined();
    const ingresar = links.find((a) => a.textContent?.trim() === 'Ingresar');
    expect(ingresar?.getAttribute('href')).toBe('/panel');
  });

  it('un cliente ve Mis turnos y su Ingresar lo lleva a sus turnos', async () => {
    const links = await crearConRoles(['CLIENT'], '/mis-turnos');
    expect(links.find((a) => a.textContent?.trim() === 'Mis turnos')).toBeDefined();
    const ingresar = links.find((a) => a.textContent?.trim() === 'Ingresar');
    expect(ingresar?.getAttribute('href')).toBe('/mis-turnos');
  });
});
