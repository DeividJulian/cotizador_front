export interface Client {
  id: number;
  nombre: string;
  empresa: string | null;
  email: string;
  telefono: string | null;
  creado_en: string;
}

export interface ClientInput {
  nombre: string;
  empresa: string | null;
  email: string;
  telefono: string | null;
}
