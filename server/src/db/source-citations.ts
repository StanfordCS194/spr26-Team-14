import { db } from "./client";
import type { MentionSentiment } from "./monitoring-prompts";
import type { MonitoringProvider } from "./monitoring-runs";

export type SourceType = "reddit" | "publication" | "review" | "video" | "wiki" | "other";

interface CitationRow {
  id: string;
  business_profile_id: string;
  monitoring_attempt_id: string;
  monitoring_prompt_id: string;
  provider: MonitoringProvider;
  url: string;
  canonical_url: string;
  domain: string;
  source_type: SourceType;
  sentiment: MentionSentiment;
  brands_mentioned_json: string;
  created_at: string;
}

const insertCitation = db.query<CitationRow, [
  string, string, string, string, MonitoringProvider, string, string, string,
  SourceType, MentionSentiment, string, string,
]>(`
  INSERT INTO source_citations (
    id, business_profile_id, monitoring_attempt_id, monitoring_prompt_id, provider,
    url, canonical_url, domain, source_type, sentiment, brands_mentioned_json, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(monitoring_attempt_id, canonical_url) DO UPDATE SET url = excluded.url
  RETURNING *
`);
const listCitations = db.query<CitationRow, [string]>(`
  SELECT * FROM source_citations WHERE business_profile_id = ? ORDER BY created_at DESC
`);

function fromRow(row: CitationRow) {
  return {
    id: row.id,
    businessProfileId: row.business_profile_id,
    monitoringAttemptId: row.monitoring_attempt_id,
    monitoringPromptId: row.monitoring_prompt_id,
    provider: row.provider,
    url: row.url,
    canonicalUrl: row.canonical_url,
    domain: row.domain,
    sourceType: row.source_type,
    sentiment: row.sentiment,
    brandsMentioned: JSON.parse(row.brands_mentioned_json) as string[],
    createdAt: row.created_at,
  };
}

export const sourceCitations = {
  add(input: {
    businessProfileId: string;
    monitoringAttemptId: string;
    monitoringPromptId: string;
    provider: MonitoringProvider;
    url: string;
    canonicalUrl: string;
    domain: string;
    sourceType: SourceType;
    sentiment: MentionSentiment;
    brandsMentioned: string[];
    createdAt: string;
  }) {
    return fromRow(insertCitation.get(
      crypto.randomUUID(),
      input.businessProfileId,
      input.monitoringAttemptId,
      input.monitoringPromptId,
      input.provider,
      input.url,
      input.canonicalUrl,
      input.domain,
      input.sourceType,
      input.sentiment,
      JSON.stringify(input.brandsMentioned),
      input.createdAt,
    )!);
  },

  list(businessProfileId: string) {
    return listCitations.all(businessProfileId).map(fromRow);
  },
};
