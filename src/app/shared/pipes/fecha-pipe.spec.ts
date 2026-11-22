import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FechaPipe } from './fecha-pipe';

registerLocaleData(localeEsAr);

describe('FechaPipe', () => {
  let pipe: FechaPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'es-AR' }] });
    pipe = TestBed.runInInjectionContext(() => new FechaPipe());
  });

  it('muestra la fecha en palabras por defecto', () => {
    expect(pipe.transform('2025-10-28T09:30:00')).toBe('Martes 28 de octubre');
    expect(pipe.transform('2025-10-29T09:30:00', 'larga')).toBe('Miércoles 29 de octubre');
  });

  it('muestra la versión corta en minúscula y sin puntos', () => {
    expect(pipe.transform('2025-10-28T09:30:00', 'corta')).toBe('mar 28 oct');
    expect(pipe.transform('2025-11-01T09:30:00', 'corta')).toBe('sáb 1 nov');
  });

  it('no cambia de día en los extremos de la jornada', () => {
    expect(pipe.transform('2025-10-28T00:00:00', 'corta')).toBe('mar 28 oct');
    expect(pipe.transform('2025-10-28T23:59:59', 'corta')).toBe('mar 28 oct');
    expect(pipe.transform('2025-10-28', 'corta')).toBe('mar 28 oct');
  });

  it('acepta un objeto Date', () => {
    expect(pipe.transform(new Date(2025, 9, 28))).toBe('Martes 28 de octubre');
  });

  it('devuelve vacío si no hay una fecha válida', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined, 'corta')).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('abc')).toBe('');
    expect(pipe.transform(new Date(Number.NaN))).toBe('');
  });
});
