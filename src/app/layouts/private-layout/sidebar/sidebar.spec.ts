import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RoleName, UserResponse } from '../../../core/models/usuario';
import { AuthService } from '../../../core/services/auth-service';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  const cerrarSesion = vi.fn();
  const usuario = signal<UserResponse | null>(null);

  // Arma el sidebar logueado con esos roles. El tieneRol del mock hace la misma cuenta que el
  // de AuthService, asi el filtro de links se prueba de verdad
  async function crear(roles: RoleName[]): Promise<void> {
    usuario.set({
      id: '1',
      name: 'Lucía Fernández',
      email: 'lucia@prueba.test',
      createdAt: '2026-11-01T10:00:00',
      active: true,
      roles,
    });
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            usuario: usuario.asReadonly(),
            cerrarSesion,
            tieneRol: (lista: RoleName[]) => !!usuario()?.roles.some((r) => lista.includes(r)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  // los textos de los links del menu, en orden
  function links(): string[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).map(
      (a) => a.textContent?.trim() ?? '',
    );
  }

  beforeEach(async () => {
    cerrarSesion.mockClear();
    await crear(['OWNER']);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra las iniciales, el nombre y el email del usuario logueado', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('LF');
    expect(texto).toContain('Lucía Fernández');
    expect(texto).toContain('lucia@prueba.test');
  });

  it('el botón Cerrar sesión cierra la sesión', () => {
    const boton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent?.includes('Cerrar sesión'));
    boton!.click();
    expect(cerrarSesion).toHaveBeenCalled();
  });

  it('al dueño le muestra todo el panel y el botón de nuevo turno', () => {
    expect(links()).toEqual([
      '+ Nuevo turno',
      'Hoy',
      'Agenda',
      'Turnos',
      'Servicios y equipo',
      'Estadísticas',
      'Mi negocio',
      'Horarios y plantillas',
    ]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Configuración');
  });

  it('al empleado solo le muestra sus dos pantallas, sin nuevo turno ni Configuración', async () => {
    TestBed.resetTestingModule();
    await crear(['EMPLOYEE']);

    expect(links()).toEqual(['Mis turnos', 'Mi actividad']);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Configuración');
  });

  it('al que es dueño y empleado le suma Mi actividad al menú del dueño', async () => {
    TestBed.resetTestingModule();
    await crear(['OWNER', 'EMPLOYEE']);

    expect(links()).toContain('Mi actividad');
    expect(links()).toContain('Turnos');
  });
});
