import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserResponse } from '../../../core/models/usuario';
import { AuthService } from '../../../core/services/auth-service';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  const cerrarSesion = vi.fn();
  const usuario = signal<UserResponse | null>({
    id: '1',
    name: 'Lucía Fernández',
    email: 'lucia@prueba.test',
    createdAt: '2026-11-01T10:00:00',
    active: true,
    roles: ['OWNER'],
  });

  beforeEach(async () => {
    cerrarSesion.mockClear();
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { usuario: usuario.asReadonly(), cerrarSesion } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
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
});
