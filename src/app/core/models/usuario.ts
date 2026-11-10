export type RoleName = 'OWNER' | 'EMPLOYEE' | 'CLIENT' | 'ADMIN';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  active: boolean;
  roles: RoleName[];
  /**
   * Negocio en el que trabaja un EMPLOYEE. Pedido al back para Mi actividad (TA-29): hoy
   * /auth/me no lo trae y un EMPLOYEE no puede pedir /businesses/mine.
   */
  businessId?: string | null;
  businessName?: string | null;
}
