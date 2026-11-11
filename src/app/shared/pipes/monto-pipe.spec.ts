import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MontoPipe } from './monto-pipe';

registerLocaleData(localeEsAr);

describe('MontoPipe', () => {
  let pipe: MontoPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'es-AR' }] });
    pipe = TestBed.runInInjectionContext(() => new MontoPipe());
  });

  it('usa punto de miles y no deja espacio después del signo', () => {
    expect(pipe.transform(12500)).toBe('$12.500');
    expect(pipe.transform(1842000)).toBe('$1.842.000');
    expect(pipe.transform(800)).toBe('$800');
    expect(pipe.transform(0)).toBe('$0');
  });

  it('no muestra decimales', () => {
    expect(pipe.transform(12500.4)).toBe('$12.500');
    expect(pipe.transform(12500.5)).toBe('$12.501');
  });

  it('acepta montos que llegan como texto', () => {
    expect(pipe.transform('12500.00')).toBe('$12.500');
  });

  it('pone el signo negativo antes del signo de pesos', () => {
    expect(pipe.transform(-12500)).toBe('-$12.500');
  });

  it('devuelve vacío si no hay un monto válido', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('abc')).toBe('');
    expect(pipe.transform(Number.NaN)).toBe('');
  });
});
