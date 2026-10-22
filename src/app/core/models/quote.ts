export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
export type Complexity = 'low' | 'medium' | 'high';

export const STATUSES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected'];

/** Text shown to the user for each status. */
export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
};

/** Same transitions the backend validates (services/quoting.py). */
export const NEXT_STATUSES: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'draft'],
  accepted: [],
  rejected: [],
};

/** Complexity and confidence come as 'low' | 'medium' | 'high'. */
export const LEVEL_LABELS: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };

/** Category of QA, management and deployment (calculated as a % of development). */
export const CROSS_CUTTING = 'Transversal';
/** Category of the modules the user adds by hand. */
export const CUSTOM = 'Personalizado';

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as QuoteStatus] ?? status;
}

export function levelLabel(level: string | null | undefined): string {
  return level ? (LEVEL_LABELS[level] ?? level) : '—';
}

/** Same reference the backend proposal uses (services/proposal.py). */
export function quoteCode(id: number): string {
  return `COT-${String(id).padStart(4, '0')}`;
}

export interface QuoteSummary {
  id: number;
  title: string;
  /** Optional: who the project is for */
  client_name: string | null;
  client_company: string | null;
  status: QuoteStatus;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface QuoteItem {
  id: number;
  name: string;
  category: string;
  complexity: Complexity;
  source: 'ai' | 'manual';
  hours_optimistic: number;
  hours_likely: number;
  hours_pessimistic: number;
  hours_expected: number;
  split: Record<string, number>;
  reasons: string;
}

export interface ScopeModule {
  key: string;
  name: string;
  category: string;
  complexity: Complexity;
  matched_keywords: string[];
  reasons: string;
}

export interface Analysis {
  modules: ScopeModule[];
  high_complexity_signals: string[];
  low_complexity_signals: string[];
  confidence: string;
  warnings: string[];
}

export interface RoleEstimate {
  optimistic: number;
  likely: number;
  pessimistic: number;
  expected: number;
}

export interface Estimate {
  by_role?: Record<string, RoleEstimate>;
  hours_optimistic?: number;
  hours_likely?: number;
  hours_pessimistic?: number;
  hours_expected?: number;
  confidence?: string;
}

export interface RoleCost {
  role: string;
  hours: number;
  hourly_rate: number;
  cost: number;
}

export interface Milestone {
  name: string;
  percentage: number;
  week: number;
  amount: number;
}

export interface Financials {
  by_role?: RoleCost[];
  direct_cost?: number;
  contingency?: number;
  margin?: number;
  subtotal?: number;
  discount?: number;
  taxable_base?: number;
  vat?: number;
  total?: number;
  duration_weeks?: number;
  payment_milestones?: Milestone[];
}

export interface Quote extends QuoteSummary {
  scope_description: string;
  margin_pct: number;
  contingency_pct: number;
  discount_pct: number;
  vat_pct: number;
  analysis: Partial<Analysis>;
  estimate: Estimate;
  financials: Financials;
  proposal: string | null;
  items: QuoteItem[];
}

export interface QuoteParams {
  margin_pct: number;
  contingency_pct: number;
  discount_pct: number;
  vat_pct: number;
}

export interface QuoteCreate extends QuoteParams {
  title: string;
  scope_description: string;
  client_name?: string | null;
  client_company?: string | null;
}

export interface QuoteUpdate extends Partial<QuoteParams> {
  title?: string;
  scope_description?: string;
  client_name?: string;
  client_company?: string;
}

export interface ItemInput {
  name: string;
  category?: string;
  complexity: Complexity;
  hours_likely: number;
  split?: Record<string, number> | null;
}

export interface ItemUpdate {
  name?: string;
  complexity?: Complexity;
  hours_likely?: number;
  split?: Record<string, number>;
}

export interface SimilarQuote {
  id: number;
  title: string;
  status: QuoteStatus;
  total: number;
  similarity: number;
}

export interface ScopeEstimate {
  analysis: Analysis;
  items: Omit<QuoteItem, 'id'>[];
  estimate: Estimate;
}

export interface SimulationInput extends QuoteParams {
  hours_by_role: Record<string, number>;
}
