// Runtime schemas (Zod) of the API responses. TypeScript types vanish when the app runs: `get<Quote>()` only
// *assumes* the server sent a quote. These schemas check it while the app runs.
//
// They are written by hand but cannot drift from the contract: every schema has a compile-time check that the
// type it produces is EXACTLY the type generated from openapi.json. If the backend adds, removes or changes a
// field, `npm run gen:api` changes the generated type and this file stops compiling until the schema follows.
import * as z from 'zod/mini';

import type * as Api from '../../api/models';

/** true only when A and B are the same type (a missing or extra field, or a different one, gives false). */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Mismatch = 'El esquema Zod no coincide con el tipo generado del contrato: actualízalo';

/** sameAs<Api.QuoteOut>()(z.object(...)) does not compile unless the schema produces exactly Api.QuoteOut. */
function sameAs<T>() {
  return <S extends z.ZodMiniType>(
    schema: S & (Same<z.output<S>, T> extends true ? unknown : Mismatch),
  ): S => schema;
}

const status = z.enum(['draft', 'sent', 'accepted', 'rejected']);
const level = z.enum(['low', 'medium', 'high']);
const split = z.record(z.string(), z.number());

export const UserSchema = sameAs<Api.UserOut>()(
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    created_at: z.string(),
    last_login_at: z.nullable(z.string()),
  }),
);
export const SessionSchema = sameAs<Api.SessionOut>()(
  z.object({ token: z.string().check(z.minLength(1)), user: UserSchema }),
);
export const CodeSentSchema = sameAs<Api.CodeSent>()(
  z.object({ message: z.string(), email: z.string() }),
);
export const MessageSchema = sameAs<Api.Message>()(z.object({ message: z.string() }));

export const ScopeModuleSchema = sameAs<Api.ScopeModule>()(
  z.object({
    key: z.string(),
    name: z.string(),
    category: z.string(),
    complexity: level,
    matched_keywords: z.array(z.string()),
    reasons: z.string(),
  }),
);
export const AnalysisSchema = sameAs<Api.Analysis>()(
  z.object({
    modules: z.array(ScopeModuleSchema),
    high_complexity_signals: z.array(z.string()),
    low_complexity_signals: z.array(z.string()),
    confidence: z.nullable(level),
    warnings: z.array(z.string()),
  }),
);
const RoleHoursSchema = sameAs<Api.RoleHours>()(
  z.object({
    optimistic: z.number(),
    likely: z.number(),
    pessimistic: z.number(),
    expected: z.number(),
  }),
);
export const EstimateSchema = sameAs<Api.Estimate>()(
  z.object({
    by_role: z.nullable(z.record(z.string(), RoleHoursSchema)),
    hours_optimistic: z.nullable(z.number()),
    hours_likely: z.nullable(z.number()),
    hours_pessimistic: z.nullable(z.number()),
    hours_expected: z.nullable(z.number()),
    confidence: z.nullable(level),
  }),
);

const RoleCostSchema = sameAs<Api.RoleCost>()(
  z.object({ role: z.string(), hours: z.number(), hourly_rate: z.number(), cost: z.number() }),
);
const MilestoneSchema = sameAs<Api.Milestone>()(
  z.object({ name: z.string(), percentage: z.number(), week: z.number(), amount: z.number() }),
);
const FinanceParamsSchema = sameAs<Api.FinanceParams>()(
  z.object({
    margin_pct: z.number(),
    contingency_pct: z.number(),
    discount_pct: z.number(),
    vat_pct: z.number(),
  }),
);
const pesos = z.nullable(z.int());
export const FinancialsSchema = sameAs<Api.Financials>()(
  z.object({
    by_role: z.nullable(z.array(RoleCostSchema)),
    direct_cost: pesos,
    contingency: pesos,
    margin: pesos,
    subtotal: pesos,
    discount: pesos,
    taxable_base: pesos,
    vat: pesos,
    total: pesos,
    duration_weeks: z.nullable(z.int()),
    payment_milestones: z.nullable(z.array(MilestoneSchema)),
    params: z.nullable(FinanceParamsSchema),
  }),
);

const hours = {
  hours_optimistic: z.number(),
  hours_likely: z.number(),
  hours_pessimistic: z.number(),
  hours_expected: z.number(),
};
export const ItemSchema = sameAs<Api.ItemOut>()(
  z.object({
    id: z.number(),
    name: z.string(),
    category: z.string(),
    complexity: level,
    source: z.enum(['ai', 'manual']),
    split,
    reasons: z.string(),
    ...hours,
  }),
);
const EstimatedItemSchema = sameAs<Api.EstimatedItem>()(z.omit(ItemSchema, { id: true }));

const summary = {
  id: z.number(),
  title: z.string(),
  client_name: z.nullable(z.string()),
  client_company: z.nullable(z.string()),
  status,
  total: z.int(),
  created_at: z.string(),
  updated_at: z.string(),
};
export const QuoteSummarySchema = sameAs<Api.QuoteSummary>()(z.object(summary));
export const QuoteSchema = sameAs<Api.QuoteOut>()(
  z.object({
    ...summary,
    scope_description: z.string(),
    margin_pct: z.number(),
    contingency_pct: z.number(),
    discount_pct: z.number(),
    vat_pct: z.number(),
    analysis: AnalysisSchema,
    estimate: EstimateSchema,
    financials: FinancialsSchema,
    proposal: z.nullable(z.string()),
    items: z.array(ItemSchema),
  }),
);
export const SimilarQuoteSchema = sameAs<Api.SimilarQuote>()(
  z.object({
    id: z.number(),
    title: z.string(),
    status,
    total: z.number(),
    similarity: z.number().check(z.minimum(0), z.maximum(1)),
  }),
);
export const ScopeEstimateSchema = sameAs<Api.ScopeEstimate>()(
  z.object({
    analysis: AnalysisSchema,
    items: z.array(EstimatedItemSchema),
    estimate: EstimateSchema,
  }),
);
export const ProposalSchema = sameAs<Api.ProposalOut>()(
  z.object({ quote_id: z.number(), proposal: z.string() }),
);

export const RateSchema = sameAs<Api.RateOut>()(
  z.object({ id: z.number(), role: z.string(), hourly_rate: z.int() }),
);
export const MarketRateSchema = sameAs<Api.MarketRate>()(
  z.object({ role: z.string(), hourly_rate: z.int() }),
);

export const StatsSchema = sameAs<Api.Stats>()(
  z.object({
    total_quotes: z.int(),
    by_status: z.object({
      draft: z.number(),
      sent: z.number(),
      accepted: z.number(),
      rejected: z.number(),
    }),
    close_rate_pct: z.nullable(z.number()),
    average_ticket: z.number(),
    accepted_value: z.number(),
    negotiating_value: z.number(),
    hours_by_role: z.record(z.string(), z.number()),
    top_modules: z.array(z.object({ module: z.string(), count: z.number() })),
  }),
);
export const SeedResultSchema = sameAs<Api.SeedResult>()(
  z.object({ message: z.string(), summary: z.object({ quotes: z.number() }) }),
);

export const AiStatusSchema = sameAs<Api.AiStatus>()(
  z.object({ configured: z.boolean(), provider: z.string(), model: z.string() }),
);
export const ScopeReviewSchema = sameAs<Api.ScopeReview>()(
  z.object({
    quote_id: z.number(),
    suggestions: z.array(
      z.object({
        key: z.string(),
        name: z.string(),
        category: z.string(),
        hours_likely: z.number(),
        split,
        reason: z.string(),
      }),
    ),
    missing_details: z.array(z.string()),
  }),
);
export const PriceExplanationSchema = sameAs<Api.PriceExplanation>()(
  z.object({
    quote_id: z.number(),
    summary: z.string(),
    drivers: z.array(z.string()),
    ways_to_lower: z.array(z.string()),
  }),
);
export const ClientQuestionsSchema = sameAs<Api.ClientQuestions>()(
  z.object({
    quote_id: z.number(),
    questions: z.array(z.string()),
    risks: z.array(z.object({ risk: z.string(), mitigation: z.string() })),
  }),
);
export const ProposalWordingSchema = sameAs<Api.ProposalWording>()(
  z.object({
    quote_id: z.number(),
    sections: z.array(
      z.object({ heading: z.string(), original: z.string(), improved: z.string() }),
    ),
    discarded: z.array(z.string()),
  }),
);
