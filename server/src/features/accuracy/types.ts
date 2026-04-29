export type ClaimVerdict = "contradicted" | "unverifiable";

export type ClaimDimension = "pricing" | "founded_year" | "headquarters";

export interface FactSheet {
  id: string;
  brandId: string;
  /** Free-form pricing string, e.g. "$49/month per seat". */
  pricing?: string;
  /** Four-digit founding year. */
  foundedYear?: number;
  /** Free-form HQ string, e.g. "San Francisco, CA". */
  headquarters?: string;
  keyFeatures: string[];
  executives: string[];
  createdAt: string;
}

export interface AccuracyFlag {
  id: string;
  brandId: string;
  answerId: string;
  promptRunId: string;
  dimension: ClaimDimension;
  verdict: ClaimVerdict;
  /** What we found in the AI answer. */
  claim: string;
  /** What the fact sheet says it should be. */
  groundTruth: string;
  /** Short snippet from the answer for evidence. */
  evidence: string;
  detectedAt: string;
}
