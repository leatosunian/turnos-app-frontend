import { periodoAnterior } from './actividad';

describe('periodoAnterior', () => {
  // martes 10 de noviembre de 2026
  const HOY = new Date(2026, 10, 10);

  it('la semana anterior va de lunes a domingo', () => {
    expect(periodoAnterior('WEEK', HOY)).toEqual({ desde: '2026-11-02', hasta: '2026-11-08' });
    // un domingo sigue siendo parte de la semana que arrancó el lunes
    expect(periodoAnterior('WEEK', new Date(2026, 10, 15))).toEqual({
      desde: '2026-11-02',
      hasta: '2026-11-08',
    });
  });

  it('el mes anterior entero, también al cruzar el año', () => {
    expect(periodoAnterior('MONTH', HOY)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(periodoAnterior('MONTH', new Date(2026, 0, 20))).toEqual({
      desde: '2025-12-01',
      hasta: '2025-12-31',
    });
  });

  it('el año anterior entero', () => {
    expect(periodoAnterior('YEAR', HOY)).toEqual({ desde: '2025-01-01', hasta: '2025-12-31' });
  });
});
