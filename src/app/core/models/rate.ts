export interface Rate {
  id: number;
  role: string;
  hourly_rate: number;
}

export interface RateInput {
  role: string;
  hourly_rate: number;
}
