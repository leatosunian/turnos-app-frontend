import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { Boton } from './boton';

@Component({
  imports: [Boton, RouterLink],
  template: `
    <button appBoton id="primario" type="button">Guardar</button>
    <button appBoton id="secundario" variante="secundario" type="button">Cancelar</button>
    <button appBoton id="destructivo" variante="destructivo" type="button">Suspender</button>
    <button appBoton id="grande" grande class="w-full" type="button">Reservar</button>
    <button appBoton id="deshabilitado" disabled type="button">Guardando…</button>
    <a appBoton id="link" variante="secundario" routerLink="/ingresar">Ingresar</a>
  `,
})
class Prueba {}

describe('Boton', () => {
  let fixture: ComponentFixture<Prueba>;

  const boton = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Prueba],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Prueba);
    await fixture.whenStable();
  });

  it('es primario y de 40 px si no se aclara nada', () => {
    expect(boton('primario').classList).toContain('bg-accent');
    expect(boton('primario').classList).toContain('text-on-accent');
    expect(boton('primario').classList).toContain('h-10');
  });

  it('aplica las clases de cada variante', () => {
    expect(boton('secundario').classList).toContain('border-line-strong');
    expect(boton('secundario').classList).not.toContain('bg-accent');
    expect(boton('destructivo').classList).toContain('text-danger-fg');
  });

  it('con grande pasa a 48 px y conserva las clases propias', () => {
    expect(boton('grande').classList).toContain('h-12');
    expect(boton('grande').classList).not.toContain('h-10');
    expect(boton('grande').classList).toContain('w-full');
  });

  it('respeta el disabled del botón', () => {
    expect((boton('deshabilitado') as HTMLButtonElement).disabled).toBe(true);
  });

  it('funciona sobre un link', () => {
    expect(boton('link').tagName).toBe('A');
    expect(boton('link').getAttribute('href')).toBe('/ingresar');
    expect(boton('link').classList).toContain('rounded-control');
    expect(boton('link').textContent?.trim()).toBe('Ingresar');
  });
});
