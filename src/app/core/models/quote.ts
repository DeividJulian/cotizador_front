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

/** Etiquetas para complejidad y confianza: el backend envía 'baja' | 'media' | 'alta'. */
export const LEVEL_LABELS: Record<string, string> = { baja: 'Low', media: 'Medium', alta: 'High' };

export function levelLabel(level: string | null | undefined): string {
  return level ? (LEVEL_LABELS[level] ?? level) : '—';
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

export interface ScopeModule {
  clave: string;
  nombre: string;
  categoria: string;
  complejidad: Complexity;
  palabras_detectadas: string[];
  motivos: string;
}

export interface Analysis {
  modulos: ScopeModule[];
  senales_complejidad_alta: string[];
  senales_complejidad_baja: string[];
  confianza: string;
  advertencias: string[];
}

export interface RoleEstimate {
  optimista: number;
  probable: number;
  pesimista: number;
  esperadas: number;
}

export interface Estimation {
  por_rol?: Record<string, RoleEstimate>;
  horas_optimista?: number;
  horas_probable?: number;
  horas_pesimista?: number;
  horas_esperadas?: number;
  confianza?: string;
}

export interface RoleCost {
  rol: string;
  horas: number;
  valor_hora: number;
  costo: number;
}

export interface Milestone {
  nombre: string;
  porcentaje: number;
  semana: number;
  monto: number;
}

export interface Financial {
  detalle_por_rol?: RoleCost[];
  costo_directo?: number;
  contingencia?: number;
  margen?: number;
  subtotal?: number;
  descuento?: number;
  base_gravable?: number;
  iva?: number;
  total?: number;
  duracion_semanas?: number;
  hitos_pago?: Milestone[];
}

export interface Quote extends QuoteSummary {
  descripcion_alcance: string;
  margen_pct: number;
  contingencia_pct: number;
  descuento_pct: number;
  iva_pct: number;
  analisis: Partial<Analysis>;
  estimacion: Estimation;
  financiero: Financial;
  propuesta: string | null;
  items: QuoteItem[];
}

export interface QuoteParams {
  margen_pct: number;
  contingencia_pct: number;
  descuento_pct: number;
  iva_pct: number;
}

export interface QuoteCreate extends QuoteParams {
  cliente_id: number;
  titulo: string;
  descripcion_alcance: string;
}

export interface QuoteUpdate extends Partial<QuoteParams> {
  titulo?: string;
  descripcion_alcance?: string;
}

export interface ItemInput {
  nombre: string;
  categoria: string;
  complejidad: Complexity;
  horas_probable: number;
  distribucion?: Record<string, number> | null;
}

export interface ItemUpdate {
  nombre?: string;
  complejidad?: Complexity;
  horas_probable?: number;
  distribucion?: Record<string, number>;
}

export interface SimilarQuote {
  id: number;
  titulo: string;
  estado: QuoteStatus;
  total: number;
  similitud: number;
}

/** Vista compacta (GET /cotizaciones/{id}/resumen): lo único que ve un cliente, sin costos internos. */
export interface QuoteOverview {
  id: number;
  titulo: string;
  cliente: string;
  estado: QuoteStatus;
  modulos: number;
  horas_esperadas: number;
  rango_horas: [number, number];
  confianza: string | null;
  duracion_semanas: number;
  total: number;
  tiene_propuesta: boolean;
}

export type ClientAnswer = 'aceptada' | 'rechazada';

export interface ScopeEstimate {
  analisis: Analysis;
  items: Omit<QuoteItem, 'id'>[];
  estimacion: Estimation;
}
