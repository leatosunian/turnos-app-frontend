import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/api-error';

const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor. Revisá tu conexión.';
const MENSAJE_ERROR_SERVIDOR = 'Ocurrió un error inesperado. Intentá de nuevo más tarde.';

/** Convierte cualquier error HTTP en un ApiError con un mensaje que se puede mostrar al usuario. */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error: HttpErrorResponse) => throwError(() => aApiError(error))));

function aApiError(error: HttpErrorResponse): ApiError {
  if (error.status === 0) {
    return { status: 0, message: MENSAJE_SIN_CONEXION };
  }

  if (error.status >= 500) {
    // El backend devuelve el texto genérico "Internal server error", que no sirve para el usuario.
    return { status: error.status, message: MENSAJE_ERROR_SERVIDOR };
  }

  const mensaje = error.error?.message;
  return {
    status: error.status,
    message: typeof mensaje === 'string' && mensaje.trim() ? mensaje : MENSAJE_ERROR_SERVIDOR,
  };
}
