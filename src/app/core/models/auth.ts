export interface User {
  id: number;
  nombre: string;
  email: string;
  creado_en: string;
  ultimo_acceso: string | null;
}

export interface Session {
  token: string;
  usuario: User;
}

export interface RegisterInput {
  nombre: string;
  email: string;
}

export interface CodeSent {
  mensaje: string;
  email: string;
}
