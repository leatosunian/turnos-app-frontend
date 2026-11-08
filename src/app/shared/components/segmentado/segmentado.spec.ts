import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Segmentado } from './segmentado';

describe('Segmentado', () => {
  let fixture: ComponentFixture<Segmentado>;

  const botones = () =>
    Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Segmentado] }).compileComponents();
    fixture = TestBed.createComponent(Segmentado);
    fixture.componentRef.setInput('etiqueta', 'Período');
    fixture.componentRef.setInput('opciones', [
      { valor: 'hoy', texto: 'Hoy' },
      { valor: 'mes', texto: 'Mes' },
      { valor: 'anio', texto: 'Año' },
    ]);
    fixture.componentRef.setInput('valor', 'mes');
    await fixture.whenStable();
  });

  it('muestra una opción por valor y marca la activa', () => {
    expect(botones().map((b) => b.textContent?.trim())).toEqual(['Hoy', 'Mes', 'Año']);
    expect(botones().map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(botones()[1].classList).toContain('bg-line');
  });

  it('cambia el valor al tocar otra opción', async () => {
    botones()[2].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.valor()).toBe('anio');
    expect(botones()[2].getAttribute('aria-pressed')).toBe('true');
  });
});
