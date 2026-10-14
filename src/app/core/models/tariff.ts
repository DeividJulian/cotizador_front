export interface Tariff {
  id: number;
  rol: string;
  valor_hora: number;
}

export interface TariffInput {
  rol: string;
  valor_hora: number;
}
