import { BusinessResponse } from '../../../core/models/negocio';
import { OpcionSegmentado } from '../../../shared/components/segmentado/segmentado';

// Valores que acepta el back para cada politica. Si se manda otro, responde 400, asi que la
// pantalla solo ofrece estos. Son los mismos de la lista del back en Business y en BusinessService
export const HORAS_CANCELACION = [24, 48, 72, 96];
export const HORAS_ANTICIPACION = [0, 1, 2, 4, 12, 24];

// Lo que vale cada politica cuando el negocio no la tiene cargada. 24 h es la regla fija que
// habia antes de TA-34 y 0 h es como se reservaba siempre, sin minimo
export const CANCELACION_POR_DEFECTO = 24;
export const ANTICIPACION_POR_DEFECTO = 0;

export interface Politicas {
  cancelacion: number;
  anticipacion: number;
}

// Las opciones de los dos selectores de Mi negocio. El selector segmentado trabaja con textos,
// por eso el valor va como string y la pantalla lo pasa a numero al guardar.
// Por ejemplo 48 queda como valor '48' y texto '48 h', y el 0 de la anticipacion se muestra
// como 'Sin minimo' porque "0 h" no se entiende
export const OPCIONES_CANCELACION: OpcionSegmentado[] = HORAS_CANCELACION.map((horas) => ({
  valor: String(horas),
  texto: `${horas} h`,
}));

export const OPCIONES_ANTICIPACION: OpcionSegmentado[] = HORAS_ANTICIPACION.map((horas) => ({
  valor: String(horas),
  texto: horas === 0 ? 'Sin mínimo' : `${horas} h`,
}));

// Las politicas guardadas en el negocio, con los valores por defecto si vienen vacias.
// Pasa en los negocios creados antes de TA-34 y mientras el back no tenga TA-35, que todavia
// no devuelve minBookingNoticeHours. Por ejemplo un negocio con cancellationNoticeHours 72 y
// sin minBookingNoticeHours da cancelacion 72 y anticipacion 0
export function politicasDe(negocio: BusinessResponse | null): Politicas {
  return {
    cancelacion: negocio?.cancellationNoticeHours ?? CANCELACION_POR_DEFECTO,
    anticipacion: negocio?.minBookingNoticeHours ?? ANTICIPACION_POR_DEFECTO,
  };
}

// La linea que va abajo del selector de la politica de cancelacion, para que el dueño entienda
// que pasa con lo que eligio. Por ejemplo con 48 da "Si el cliente cancela con 48 h o más de
// anticipación, se le devuelve la seña. Con menos, la seña queda para el negocio."
export function textoCancelacion(horas: number): string {
  return (
    `Si el cliente cancela con ${horas} h o más de anticipación, se le devuelve la seña. ` +
    'Con menos, la seña queda para el negocio.'
  );
}

// Lo mismo para la anticipacion minima. Con 0 no hay limite, asi que el texto cambia. Se aclara
// lo de los turnos manuales porque el back no les aplica la restriccion: el dueño puede cargar
// un turno para dentro de 10 minutos aunque los clientes no puedan reservarlo.
// Por ejemplo con 2 da "Los clientes tienen que reservar con al menos 2 h de anticipación..."
export function textoAnticipacion(horas: number): string {
  if (horas === 0) {
    return 'Los clientes pueden reservar cualquier turno libre, aunque falte poco para que empiece.';
  }
  return (
    `Los clientes tienen que reservar con al menos ${horas} h de anticipación. ` +
    'Los turnos que cargás vos no tienen este límite.'
  );
}
