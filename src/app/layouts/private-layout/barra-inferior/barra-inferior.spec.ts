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
});
