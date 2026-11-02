import { TestBed } from '@angular/core/testing';
import { appConfig } from '../../app.config';
import { HoraPipe } from './hora-pipe';

describe('HoraPipe', () => {
  let pipe: HoraPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
    pipe = TestBed.runInInjectionContext(() => new HoraPipe());
  });

  it('usa 24 h con cero adelante', () => {
    expect(pipe.transform('2025-10-28T09:30:00')).toBe('09:30');
    expect(pipe.transform('2025-10-28T18:05:00')).toBe('18:05');
    expect(pipe.transform('2025-10-28T00:00:00')).toBe('00:00');
  });

  it('acepta las variantes de hora que puede mandar el back', () => {
    expect(pipe.transform('2025-10-28T09:30')).toBe('09:30');
    expect(pipe.transform('2025-10-28T09:30:15.123456')).toBe('09:30');
  });

  it('acepta un objeto Date', () => {
    expect(pipe.transform(new Date(2025, 9, 28, 9, 30))).toBe('09:30');
  });

  it('devuelve vacío si no hay una fecha válida', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('abc')).toBe('');
    expect(pipe.transform(new Date(Number.NaN))).toBe('');
  });
});
