export type QuoteStatus = 'borrador' | 'enviada' | 'aceptada' | 'rechazada';
export type Complexity = 'baja' | 'media' | 'alta';

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  borrador: 'Draft',
  enviada: 'Sent',
  aceptada: 'Accepted',
  rechazada: 'Rejected',
};

/** Mismas transiciones que valida el backend (services/cotizador.py). */
export const NEXT_STATUSES: Record<QuoteStatus, QuoteStatus[]> = {
  borrador: ['enviada'],
  enviada: ['aceptada', 'rechazada', 'borrador'],
  aceptada: [],
  rechazada: [],
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as QuoteStatus] ?? status;
}

/** Misma referencia que usa la propuesta del backend (services/propuesta.py). */
export function quoteCode(id: number): string {
  return `QT-${String(id).padStart(4, '0')}`;
}

export interface QuoteSummary {
  id: number;
  cliente_id: number;
  titulo: string;
  estado: QuoteStatus;
  total: number;
  creada_en: string;
  actualizada_en: string;
}

export interface QuoteItem {
  id: number;
  nombre: string;
  categoria: string;
  complejidad: Complexity;
  origen: 'ia' | 'manual';
  horas_optimista: number;
  horas_probable: number;
  horas_pesimista: number;
  horas_esperadas: number;
  distribucion: Record<string, number>;
  motivos: string;
}
