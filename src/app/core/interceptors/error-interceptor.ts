import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiError } from '../models/api-error';
import { AuthService } from '../services/auth-service';

const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor. Revisá tu conexión.';
const MENSAJE_ERROR_SERVIDOR = 'Ocurrió un error inesperado. Intentá de nuevo más tarde.';

/**
 * Convierte cualquier error HTTP en un ApiError con un mensaje que se puede mostrar al usuario.
 * Si el back responde 401, el token venció o no es válido: se cierra la sesión y se va a /ingresar.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Los 401 de /auth (credenciales incorrectas, sesión vencida al recargar) los maneja AuthService.
      if (error.status === 401 && !req.url.startsWith(`${environment.apiUrl}/auth/`)) {
        auth.cerrarSesion('/ingresar');
      }
      return throwError(() => aApiError(error));
    }),
  );
};

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
