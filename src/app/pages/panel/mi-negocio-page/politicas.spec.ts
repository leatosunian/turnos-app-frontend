import { BusinessResponse } from '../../../core/models/negocio';
import {
  OPCIONES_ANTICIPACION,
  OPCIONES_CANCELACION,
  politicasDe,
  textoAnticipacion,
  textoCancelacion,
} from './politicas';

describe('politicas', () => {
  it('arma las opciones de los selectores con los valores que acepta el back', () => {
    expect(OPCIONES_CANCELACION.map((o) => o.valor)).toEqual(['24', '48', '72', '96']);
    expect(OPCIONES_CANCELACION[1].texto).toBe('48 h');
    expect(OPCIONES_ANTICIPACION.map((o) => o.texto)).toEqual([
      'Sin mínimo',
      '1 h',
      '2 h',
      '4 h',
      '12 h',
      '24 h',
    ]);
  });

  describe('politicasDe', () => {
    it('usa lo que tiene guardado el negocio', () => {
      const negocio = { cancellationNoticeHours: 72, minBookingNoticeHours: 4 } as BusinessResponse;
      expect(politicasDe(negocio)).toEqual({ cancelacion: 72, anticipacion: 4 });
    });

    it('con valores vacíos o sin negocio usa 24 h y sin mínimo', () => {
      const viejo = { cancellationNoticeHours: null } as BusinessResponse;
      expect(politicasDe(viejo)).toEqual({ cancelacion: 24, anticipacion: 0 });
      expect(politicasDe(null)).toEqual({ cancelacion: 24, anticipacion: 0 });
    });
  });

  it('explica la política de cancelación con las horas elegidas', () => {
    expect(textoCancelacion(48)).toBe(
      'Si el cliente cancela con 48 h o más de anticipación, se le devuelve la seña. ' +
        'Con menos, la seña queda para el negocio.',
    );
  });

  it('explica la anticipación mínima y aclara que sin mínimo no hay límite', () => {
    expect(textoAnticipacion(0)).toContain('pueden reservar cualquier turno libre');
    expect(textoAnticipacion(2)).toBe(
      'Los clientes tienen que reservar con al menos 2 h de anticipación. ' +
        'Los turnos que cargás vos no tienen este límite.',
    );
  });
});
