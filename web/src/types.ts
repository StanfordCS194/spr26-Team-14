export interface BusinessProfile {
  id: string;
  name: string;
  website: string;
  description: string;
  createdAt: string;
}

export interface MonitoringPrompt {
  id: string;
  businessProfileId: string;
  prompt: string;
  category: "comparison" | "recommendation" | "feature" | "pricing" | "custom";
  cadence: "daily" | "weekly";
  active: boolean;
  mentionSentiment: "positive" | "negative" | "neutral";
  createdAt: string;
}

export interface BusinessProfileInput {
  name: string;
  website: string;
  description: string;
  competitorNames: string[];
}

export interface MonitoringResponse {
  status: "generating" | "ready" | "error";
  error: string | null;
  prompts: MonitoringPrompt[];
  history: MonitoringHistoryPoint[];
  summary: MonitoringSummary;
}

export interface MonitoringHistoryPoint {
  t: string;
  score: number;
  provider?: MonitoringProvider;
}

export type MonitoringProvider = "openai" | "anthropic" | "gemini";

export interface MonitoringAttempt {
  id: string;
  runId: string;
  monitoringPromptId: string;
  provider: MonitoringProvider;
  model: string;
  status: "success" | "error";
  rawResponse: string | null;
  score: number | null;
  mentionSentiment: "positive" | "negative" | "neutral" | null;
  mentionPosition: number | null;
  recommended: boolean;
  sources: string[];
  error: string | null;
  createdAt: string;
}

export interface MonitoringSummary {
  totalResponses: number;
  mentionFrequency: number;
  recommendedResponses: number;
  providerBreakdown: Array<{
    provider: MonitoringProvider;
    attempts: number;
    successes: number;
    mentions: number;
    errors: number;
    averageSentiment: number;
  }>;
  latestAttempts: MonitoringAttempt[];
}

export interface AccuracyAlert {
  id: string;
  businessProfileId: string;
  monitoringAttemptId: string;
  provider: MonitoringProvider;
  severity: "high" | "medium" | "low";
  status: "open" | "acknowledged";
  claimText: string;
  explanation: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccuracySummary {
  responsesChecked: number;
  totalClaims: number;
  citedClaims: number;
  citationCoverage: number;
}

export interface CitationProviderSummary {
  provider: MonitoringProvider;
  responsesChecked: number;
  totalClaims: number;
  citedClaims: number;
  citationCoverage: number | null;
}

export type RecommendationRating = "good" | "bad";

export interface RecommendationFeedback {
  businessProfileId: string;
  recommendationId: string;
  rating: RecommendationRating;
  updatedAt: string;
}

export interface RecommendationFeedbackMetrics {
  total: number;
  good: number;
  bad: number;
  unrated: number;
}

export interface AdminMetricsResponse {
  recommendationFeedback: RecommendationFeedbackMetrics;
}

export type RecommendationCategory = "content" | "earned_media" | "technical";
export type ImpactLevel = "high" | "medium" | "low";
export type EffortLevel = "low" | "medium" | "high";
export type RecommendationStatus = "proposed" | "planned" | "in_progress" | "completed" | "dismissed";

export interface Recommendation {
  id: string;
  brandId: string;
  sourceGapEventId: string;
  title: string;
  category: RecommendationCategory;
  impact: ImpactLevel;
  effort: EffortLevel;
  evidence: string;
  action: string;
  targetProvider: string | null;
  status: RecommendationStatus;
  startedAt: string | null;
  completedAt: string | null;
  lift: {
    beforeScore: number | null;
    afterScore: number | null;
    delta: number | null;
  };
  createdAt: string;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  llmConfigured: boolean;
}

export type SourceType = "reddit" | "publication" | "review" | "video" | "wiki" | "other";
export type CitedSentiment = "positive" | "neutral" | "negative";

export interface CitedSource {
  id: string;
  brandId: string;
  domain: string;
  title: string;
  citationsThisWeek: number;
  brandsMentioned: string[];
  sentiment: CitedSentiment;
  sourceType: SourceType;
  url: string;
  providers: MonitoringProvider[];
  monitoringPromptIds: string[];
  relatedRecommendationIds: string[];
  createdAt: string;
}

export interface SourcesResponse {
  sources: CitedSource[];
  llmConfigured: boolean;
}

export interface OverviewRow {
  brandId: string;
  shareOfVoice: number;
  sentiment: number;
  topFeatures: string[];
}

export interface OverviewResponse {
  timeframe: { start: string; end: string };
  rows: OverviewRow[];
}

export interface TrendPoint {
  t: string;
  sov: number;
  sentiment: number;
}

export interface TrendsResponse {
  timeframe: { start: string; end: string };
  seriesByBrand: Record<string, TrendPoint[]>;
}

export interface GapEvent {
  id: string;
  gapType: "prompt_exclusion" | "feature_praise_gap" | "whitespace";
  brandId: string;
  competitorBrandId?: string;
  promptRunId: string;
  featureKey?: string;
  categoryKey?: string;
  evidence: string[];
  confidence: number;
  detectedAt: string;
}

export type CompetitiveProgressEvent =
  | { type: "connected"; message: string; ts: string }
  | { type: "run_started"; message: string; ts: string }
  | {
      type: "answer_started" | "answer_completed";
      brandId: string;
      brandName: string;
      prompt: string;
      promptKind: "brand_specific" | "domain_general";
      message: string;
      ts: string;
    }
  | {
      type: "answer_delta";
      brandId: string;
      brandName: string;
      prompt: string;
      promptKind: "brand_specific" | "domain_general";
      text: string;
      ts: string;
    }
  | {
      type: "judge_started" | "judge_completed";
      prompt: string;
      promptKind: "brand_specific" | "domain_general";
      message: string;
      ts: string;
    }
  | {
      type: "judge_delta";
      prompt: string;
      promptKind: "brand_specific" | "domain_general";
      text: string;
      ts: string;
    }
  | { type: "run_completed"; message: string; ts: string }
  | { type: "run_failed"; message: string; ts: string };
