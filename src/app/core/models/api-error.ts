/** Forma de los errores que devuelve el backend y que expone el interceptor de errores. */
export interface ApiError {
  status: number;
  message: string;
}
