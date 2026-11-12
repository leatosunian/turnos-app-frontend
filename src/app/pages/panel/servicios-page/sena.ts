/** Si el servicio no tiene porcentaje de seña, el back usa 30 %. */
export const PORCENTAJE_SENA_POR_DEFECTO = 30;

/** Monto de la seña: precio × porcentaje / 100. El monto exacto de un turno viene en deposit.amount. */
export function montoSena(precio: number, porcentaje: number | null | undefined): number {
  return (precio * (porcentaje ?? PORCENTAJE_SENA_POR_DEFECTO)) / 100;
}
