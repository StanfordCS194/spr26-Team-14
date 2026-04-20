export type UUID = string;

export interface Brand {
  id: UUID;
  name: string;
}

export interface CompetitorSet {
  id: UUID;
  accountBrandId: UUID;
  competitorBrandIds: [UUID, UUID, UUID, UUID, UUID];
  createdAt: string;
}

export type PromptKind = "brand_specific" | "domain_general";

export interface PromptSet {
  id: UUID;
  name: string;
  /** Per-brand perception prompts; use `{brand}` — substituted per competitor. */
  brandSpecificPrompts: string[];
  /** Category-wide questions (leader, best, most reliable); same text for all brands. */
  domainPrompts: string[];
  createdAt: string;
}

export interface CohortRun {
  accountBrandId: UUID;
  competitorBrandIds: [UUID, UUID, UUID, UUID, UUID];
  promptSetId: UUID;
  models: string[];
  windowStart: string;
  windowEnd: string;
}

export interface PromptRun {
  id: UUID;
  promptSetId: UUID;
  prompt: string;
  promptKind: PromptKind;
  model: string;
  createdAt: string;
}

export interface AIAnswer {
  id: UUID;
  promptRunId: UUID;
  brandId: UUID;
  answerText: string;
  createdAt: string;
}

export interface Mention {
  brandId: UUID;
  sentiment: number;
  confidence: number;
}

export interface ComparativeDelta {
  promptRunId: UUID;
  shareOfVoiceByBrand: Record<UUID, number>;
  sentimentByBrand: Record<UUID, number>;
  praisedFeaturesByBrand: Record<UUID, string[]>;
  evidence: string[];
}

export type GapType = "prompt_exclusion" | "feature_praise_gap" | "whitespace";

export interface GapEvent {
  id: UUID;
  gapType: GapType;
  brandId: UUID;
  competitorBrandId?: UUID;
  promptRunId: UUID;
  featureKey?: string;
  categoryKey?: string;
  evidence: string[];
  confidence: number;
  detectedAt: string;
}
