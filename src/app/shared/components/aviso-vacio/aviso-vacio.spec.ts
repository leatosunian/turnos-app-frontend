import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvisoVacio } from './aviso-vacio';

@Component({
  imports: [AvisoVacio],
  template: `
    <app-aviso-vacio
      id="con-accion"
      titulo="Todavía no cargaste servicios"
      detalle="Sin servicios no hay reservas."
    >
      <button type="button">Crear el primero</button>
    </app-aviso-vacio>
    <app-aviso-vacio id="solo" titulo="No hay turnos para hoy" />
  `,
})
class Prueba {}

describe('AvisoVacio', () => {
  let fixture: ComponentFixture<Prueba>;

  const aviso = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Prueba] }).compileComponents();
    fixture = TestBed.createComponent(Prueba);
    await fixture.whenStable();
  });

  it('muestra el título, el detalle y la acción', () => {
    expect(aviso('con-accion').textContent).toContain('Todavía no cargaste servicios');
    expect(aviso('con-accion').textContent).toContain('Sin servicios no hay reservas.');
    expect(aviso('con-accion').querySelector('button')?.textContent).toBe('Crear el primero');
  });

  it('sin detalle muestra solo el título', () => {
    expect(aviso('solo').querySelectorAll('p').length).toBe(1);
  });
});
