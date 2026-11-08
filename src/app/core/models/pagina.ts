/**
 * Página tal como la manda Spring. Según la configuración del back, los totales vienen
 * sueltos (`totalElements`) o adentro de `page`, así que se aceptan las dos formas.
 */
export interface PageResponse<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  page?: { size: number; number: number; totalElements: number; totalPages: number };
}

/** Página ya normalizada para usar en el front. `numero` arranca en 0, como en el back. */
export interface Pagina<T> {
  items: T[];
  numero: number;
  tamanio: number;
  total: number;
  totalPaginas: number;
}

export function aPagina<T>(respuesta: PageResponse<T>): Pagina<T> {
  const datos = respuesta.page ?? respuesta;
  return {
    items: respuesta.content ?? [],
    numero: datos.number ?? 0,
    tamanio: datos.size ?? respuesta.content?.length ?? 0,
    total: datos.totalElements ?? 0,
    totalPaginas: datos.totalPages ?? 0,
  };
}
