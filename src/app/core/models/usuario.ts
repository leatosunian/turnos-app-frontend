export type RoleName = 'OWNER' | 'EMPLOYEE' | 'CLIENT' | 'ADMIN';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  active: boolean;
  roles: RoleName[];
}

/** Reemplaza todos los roles del usuario. Tiene que tener al menos uno. */
export interface RoleUpdateRequest {
  roles: RoleName[];
}
