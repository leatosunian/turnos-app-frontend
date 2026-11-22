import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Slot } from './slot';

@Component({
  imports: [Slot],
  template: `
    <button appSlot id="libre" type="button">09:00</button>
    <button appSlot id="elegido" seleccionado grande type="button">09:30</button>
    <button appSlot id="ocupado" disabled type="button">10:00</button>
  `,
})
class Prueba {}

describe('Slot', () => {
  let fixture: ComponentFixture<Prueba>;

  const slot = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Prueba] }).compileComponents();
    fixture = TestBed.createComponent(Prueba);
    await fixture.whenStable();
  });

  it('marca el seleccionado en ámbar y con aria-pressed', () => {
    expect(slot('elegido').classList).toContain('bg-accent');
    expect(slot('elegido').getAttribute('aria-pressed')).toBe('true');
    expect(slot('libre').getAttribute('aria-pressed')).toBe('false');
    expect(slot('libre').classList).not.toContain('bg-accent');
  });

  it('cambia de alto con grande', () => {
    expect(slot('libre').classList).toContain('h-10');
    expect(slot('elegido').classList).toContain('h-12');
  });

  it('el ocupado queda deshabilitado', () => {
    expect(slot('ocupado').disabled).toBe(true);
  });
});
