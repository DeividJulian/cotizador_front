export interface AIStatus {
  configured: boolean;
  provider: string;
  model: string;
}

/** A catalog module the AI thinks is missing: ready to add as a manual item. */
export interface ModuleSuggestion {
  key: string;
  name: string;
  category: string;
  hours_likely: number;
  split: Record<string, number>;
  reason: string;
}

export interface ScopeReview {
  quote_id: number;
  suggestions: ModuleSuggestion[];
  missing_details: string[];
}

export interface PriceExplanation {
  quote_id: number;
  summary: string;
  drivers: string[];
  ways_to_lower: string[];
}

export interface Risk {
  risk: string;
  mitigation: string;
}

export interface ClientQuestions {
  quote_id: number;
  questions: string[];
  risks: Risk[];
}

export interface SectionChange {
  heading: string;
  original: string;
  improved: string;
}

export interface ProposalWording {
  quote_id: number;
  sections: SectionChange[];
  /** Sections left out because the AI changed a figure */
  discarded: string[];
}
