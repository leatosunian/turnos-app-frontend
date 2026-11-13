export type RoleName = 'OWNER' | 'EMPLOYEE' | 'CLIENT' | 'ADMIN';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  active: boolean;
  roles: RoleName[];
  /**
   * Negocio en el que trabaja un EMPLOYEE (lo trae /auth/me; un EMPLOYEE no puede pedir
   * /businesses/mine). Lo usa Mi actividad. Para los demás roles viene null.
   */
  businessId?: string | null;
  businessName?: string | null;
}

/** Reemplaza todos los roles del usuario. Tiene que tener al menos uno. */
export interface RoleUpdateRequest {
  roles: RoleName[];
}
