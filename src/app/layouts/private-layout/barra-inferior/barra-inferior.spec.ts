import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BarraInferior } from './barra-inferior';

describe('BarraInferior', () => {
  let component: BarraInferior;
  let fixture: ComponentFixture<BarraInferior>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarraInferior],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BarraInferior);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('en modo admin muestra los links de administración', async () => {
    fixture.componentRef.setInput('admin', true);
    await fixture.whenStable();
    const textos = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'), (a) =>
      a.textContent?.trim(),
    );
    expect(textos).toEqual(['Resumen', 'Usuarios', 'Negocios', 'Rubros']);
  });

  it('el botón Más avisa que se tocó y refleja si el menú está abierto', async () => {
    let veces = 0;
    component.alternarMas.subscribe(() => veces++);
    const mas = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    mas.click();
    expect(veces).toBe(1);
    expect(mas.getAttribute('aria-expanded')).toBe('false');

    fixture.componentRef.setInput('masAbierto', true);
    await fixture.whenStable();
    expect(mas.getAttribute('aria-expanded')).toBe('true');
    expect(mas.getAttribute('aria-controls')).toBe('menu-mas');
  });
});
