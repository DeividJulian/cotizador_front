export interface Stats {
  total_quotes: number;
  by_status: Record<string, number>;
  close_rate_pct: number | null;
  average_ticket: number;
  accepted_value: number;
  negotiating_value: number;
  hours_by_role: Record<string, number>;
  top_modules: { module: string; count: number }[];
}
