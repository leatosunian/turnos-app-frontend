import { DuracionPipe } from './duracion-pipe';

describe('DuracionPipe', () => {
  const pipe = new DuracionPipe();

  it('muestra solo minutos si dura menos de una hora', () => {
    expect(pipe.transform(45)).toBe('45 min');
    expect(pipe.transform(0)).toBe('0 min');
  });

  it('muestra horas y minutos', () => {
    expect(pipe.transform(90)).toBe('1 h 30 min');
    expect(pipe.transform(135)).toBe('2 h 15 min');
  });

  it('omite los minutos si la hora es exacta', () => {
    expect(pipe.transform(60)).toBe('1 h');
    expect(pipe.transform(120)).toBe('2 h');
  });

  it('redondea antes de separar horas y minutos', () => {
    expect(pipe.transform(59.6)).toBe('1 h');
  });

  it('devuelve vacío si no hay una duración válida', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform(Number.NaN)).toBe('');
    expect(pipe.transform(-5)).toBe('');
  });
});
