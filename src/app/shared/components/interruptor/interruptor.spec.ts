import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Interruptor } from './interruptor';

describe('Interruptor', () => {
  let fixture: ComponentFixture<Interruptor>;

  const boton = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Interruptor] }).compileComponents();
    fixture = TestBed.createComponent(Interruptor);
    fixture.componentRef.setInput('etiqueta', 'Atiende los sábados');
    await fixture.whenStable();
  });

  it('es un switch con su etiqueta', () => {
    expect(boton().getAttribute('role')).toBe('switch');
    expect(boton().getAttribute('aria-label')).toBe('Atiende los sábados');
    expect(boton().getAttribute('aria-checked')).toBe('false');
  });

  it('se prende y se apaga con el click', async () => {
    boton().click();
    await fixture.whenStable();
    expect(fixture.componentInstance.encendido()).toBe(true);
    expect(boton().getAttribute('aria-checked')).toBe('true');
    expect(boton().classList).toContain('bg-accent');

    boton().click();
    await fixture.whenStable();
    expect(fixture.componentInstance.encendido()).toBe(false);
  });

  it('deshabilitado no cambia', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    boton().click();
    expect(fixture.componentInstance.encendido()).toBe(false);
  });
});
