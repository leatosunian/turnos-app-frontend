/**
 * Alta y edición de un profesional del equipo. El back pide la contraseña también al editar,
 * así que editar siempre le pone una contraseña nueva. La respuesta es un UserResponse.
 */
export interface EmployeeRequest {
  name: string;
  email: string;
  password: string;
}
