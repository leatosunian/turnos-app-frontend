/** Alta de un profesional del equipo. La respuesta es un UserResponse. */
export interface EmployeeRequest {
  name: string;
  email: string;
  password: string;
}

// Edicion de un profesional (el EmployeeUpdateRequest del back). Es igual que el alta pero la
// contraseña es opcional: si no se manda, el back deja la que tenia. Asi el dueño puede corregir
// el nombre o el email sin tener que pasarle una clave nueva.
export interface EmployeeUpdateRequest {
  name: string;
  email: string;
  password?: string;
}
