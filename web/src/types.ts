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
