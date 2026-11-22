import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Confirmacion } from './confirmacion';

@Component({
  imports: [Confirmacion],
  template: `
    <app-confirmacion
      titulo="¿Suspender este turno?"
      textoConfirmar="Suspender"
      textoProcesando="Suspendiendo…"
      [procesando]="procesando()"
      [error]="error()"
      (confirmado)="confirmados = confirmados + 1"
      (cancelado)="cancelados = cancelados + 1"
    >
      Se le devuelve la seña.
    </app-confirmacion>
  `,
})
class Prueba {
  readonly procesando = signal(false);
  readonly error = signal('');
  confirmados = 0;
  cancelados = 0;
}

describe('Confirmacion', () => {
  let fixture: ComponentFixture<Prueba>;
  let prueba: Prueba;

  const el = () => fixture.nativeElement as HTMLElement;
  const boton = (texto: string) =>
    Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;
  const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Prueba] }).compileComponents();
    fixture = TestBed.createComponent(Prueba);
    prueba = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('muestra el título y el detalle, con el foco en Volver', () => {
    const dialogo = el().querySelector('[role="alertdialog"]')!;
    expect(dialogo.textContent).toContain('¿Suspender este turno?');
    expect(dialogo.textContent).toContain('Se le devuelve la seña.');
    expect(document.activeElement).toBe(boton('Volver'));
  });

  it('avisa si se confirma o se cancela (con el botón o con Escape)', () => {
    boton('Suspender').click();
    boton('Volver').click();
    escape();

    expect(prueba.confirmados).toBe(1);
    expect(prueba.cancelados).toBe(2);
  });

  it('mientras procesa no deja cancelar y cambia el texto', async () => {
    prueba.procesando.set(true);
    await fixture.whenStable();

    escape();
    expect(prueba.cancelados).toBe(0);
    expect(boton('Suspendiendo…').disabled).toBe(true);
    expect(boton('Volver').disabled).toBe(true);
  });

  it('muestra el error del back', async () => {
    prueba.error.set('El turno ya no está reservado');
    await fixture.whenStable();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain(
      'El turno ya no está reservado',
    );
  });
});
