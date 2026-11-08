import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Campo } from './campo';

@Component({
  imports: [Campo],
  template: `
    <app-campo etiqueta="Teléfono" [error]="error()">
      <input type="tel" />
    </app-campo>
  `,
})
class Prueba {
  readonly error = signal<string | null>(null);
}

describe('Campo', () => {
  let fixture: ComponentFixture<Prueba>;

  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Prueba] }).compileComponents();
    fixture = TestBed.createComponent(Prueba);
    await fixture.whenStable();
  });

  it('asocia la etiqueta con el input', () => {
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    expect(label.textContent).toContain('Teléfono');
    expect(label.control).toBe(input());
  });

  it('sin error no muestra mensaje ni marca el input', () => {
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
    expect(input().hasAttribute('aria-invalid')).toBe(false);
  });

  it('con error muestra el mensaje y lo vincula al input', async () => {
    fixture.componentInstance.error.set('Revisá el número: faltan dígitos.');
    await fixture.whenStable();

    const mensaje = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(mensaje.textContent).toContain('faltan dígitos');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-describedby')).toBe(mensaje.id);
  });

  it('saca la marca cuando se corrige el error', async () => {
    fixture.componentInstance.error.set('Falta el teléfono.');
    await fixture.whenStable();
    fixture.componentInstance.error.set(null);
    await fixture.whenStable();

    expect(input().hasAttribute('aria-invalid')).toBe(false);
    expect(input().hasAttribute('aria-describedby')).toBe(false);
  });
});
