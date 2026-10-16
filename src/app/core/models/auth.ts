export interface User {
  id: number;
  nombre: string;
  email: string;
  foto_url: string | null;
  creado_en: string;
  ultimo_acceso: string | null;
}

export interface Session {
  token: string;
  usuario: User;
}
