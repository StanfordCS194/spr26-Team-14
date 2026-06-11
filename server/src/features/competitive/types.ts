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
export type BenchmarkProvider = "openai" | "anthropic" | "gemini";

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
  provider: BenchmarkProvider;
  models: string[];
  windowStart: string;
  windowEnd: string;
}

export interface PromptRun {
  id: UUID;
  promptSetId: UUID;
  prompt: string;
  promptKind: PromptKind;
  provider?: BenchmarkProvider;
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

/** A source the judge attaches to a specific comparative claim about a brand. */
export interface Citation {
  url: string;
  /** The factual claim this source supports. */
  claim: string;
  brandId?: UUID;
}

export interface ComparativeDelta {
  promptRunId: UUID;
  shareOfVoiceByBrand: Record<UUID, number>;
  sentimentByBrand: Record<UUID, number>;
  praisedFeaturesByBrand: Record<UUID, string[]>;
  evidence: string[];
  citations: Citation[];
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

export type RecommendationCategory = "content" | "earned_media" | "technical";
export type ImpactLevel = "high" | "medium" | "low";
export type EffortLevel = "low" | "medium" | "high";

export interface Recommendation {
  id: UUID;
  brandId: UUID;
  sourceGapEventId: UUID;
  title: string;
  category: RecommendationCategory;
  impact: ImpactLevel;
  effort: EffortLevel;
  evidence: string;
  action: string;
  createdAt: string;
}

export type SourceType = "reddit" | "publication" | "review" | "video" | "wiki" | "other";
export type CitedSentiment = "positive" | "neutral" | "negative";

export interface CitedSource {
  id: UUID;
  brandId: UUID;
  domain: string;
  title: string;
  citationsThisWeek: number;
  brandsMentioned: string[];
  sentiment: CitedSentiment;
  sourceType: SourceType;
  createdAt: string;
}
