export type Role = 'admin' | 'cliente';

export const ROLE_LABELS: Record<Role, string> = { admin: 'Admin', cliente: 'Client' };

export interface User {
  id: number;
  nombre: string;
  email: string;
  empresa: string | null;
  rol: Role;
  verificado: boolean;
  cliente_id: number | null;
  creado_en: string;
  ultimo_acceso: string | null;
}

export interface Session {
  token: string;
  usuario: User;
}

export interface RegisterInput {
  nombre: string;
  empresa: string | null;
  email: string;
}

export interface CodeSent {
  mensaje: string;
  email: string;
}
