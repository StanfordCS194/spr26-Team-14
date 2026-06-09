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
  mentionSentiment: "positive" | "negative" | "neutral";
  createdAt: string;
}

export interface MonitoringResponse {
  status: "generating" | "ready" | "error";
  error: string | null;
  prompts: MonitoringPrompt[];
  history: MonitoringHistoryPoint[];
}

export interface MonitoringHistoryPoint {
  t: string;
  score: number;
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
