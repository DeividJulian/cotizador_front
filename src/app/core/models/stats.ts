export interface Stats {
  total_cotizaciones: number;
  por_estado: Record<string, number>;
  tasa_cierre_pct: number | null;
  ticket_promedio: number;
  valor_aceptado: number;
  valor_en_negociacion: number;
  horas_por_rol: Record<string, number>;
  modulos_mas_cotizados: { modulo: string; veces: number }[];
}
