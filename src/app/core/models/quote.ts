// Every API type comes from the generated client (npm run gen:api): if the backend changes a field, this
// project stops compiling where it is used. Only the labels shown to the user are written here.
import type {
  Analysis,
  Estimate,
  EstimatedItem,
  Financials,
  ItemCreate,
  ItemOut,
  ItemUpdate as ItemUpdateApi,
  Milestone as MilestoneApi,
  QuoteCreate as QuoteCreateApi,
  QuoteOut,
  QuoteSummary as QuoteSummaryApi,
  QuoteUpdate as QuoteUpdateApi,
  RoleCost as RoleCostApi,
  RoleHours,
  ScopeEstimate as ScopeEstimateApi,
  ScopeModule as ScopeModuleApi,
  SimilarQuote as SimilarQuoteApi,
  SimulationInput as SimulationInputApi,
} from '../../api/models';

export type QuoteStatus = QuoteSummaryApi['status'];
export type Complexity = ItemOut['complexity'];

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

export type QuoteSummary = QuoteSummaryApi;
export type QuoteItem = ItemOut;
export type ScopeModule = ScopeModuleApi;
export type { Analysis, Estimate, Financials };
export type RoleEstimate = RoleHours;
export type RoleCost = RoleCostApi;
export type Milestone = MilestoneApi;
export type Quote = QuoteOut;
export type QuoteParams = Required<Pick<QuoteCreateApi, 'margin_pct' | 'contingency_pct' | 'discount_pct' | 'vat_pct'>>;
export type QuoteCreate = QuoteCreateApi;
export type QuoteUpdate = QuoteUpdateApi;
export type ItemInput = ItemCreate;
export type ItemUpdate = ItemUpdateApi;
export type SimilarQuote = SimilarQuoteApi;
export type ScopeEstimate = ScopeEstimateApi;
export type ScopeItem = EstimatedItem;
export type SimulationInput = SimulationInputApi;
