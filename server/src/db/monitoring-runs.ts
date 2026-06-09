import { db } from "./client";
import type { MentionSentiment } from "./monitoring-prompts";

export type MonitoringProvider = "openai" | "anthropic" | "gemini";
export type MonitoringRunStatus = "running" | "completed" | "partial" | "failed";

export interface MonitoringAttempt {
  id: string;
  runId: string;
  businessProfileId: string;
  monitoringPromptId: string;
  provider: MonitoringProvider;
  model: string;
  status: "success" | "error";
  rawResponse: string | null;
  score: number | null;
  mentionSentiment: MentionSentiment | null;
  mentionPosition: number | null;
  recommended: boolean;
  featureSentiment: Record<string, MentionSentiment>;
  sources: string[];
  error: string | null;
  createdAt: string;
}

interface AttemptRow {
  id: string;
  run_id: string;
  business_profile_id: string;
  monitoring_prompt_id: string;
  provider: MonitoringProvider;
  model: string;
  status: "success" | "error";
  raw_response: string | null;
  score: number | null;
  mention_sentiment: MentionSentiment | null;
  mention_position: number | null;
  recommended: number;
  feature_sentiment_json: string;
  sources_json: string;
  error: string | null;
  created_at: string;
}

const insertRun = db.query<null, [string, string, string, string]>(`
  INSERT INTO monitoring_runs (id, business_profile_id, status, started_at)
  VALUES (?, ?, ?, ?)
`);

const finishRun = db.query<null, [MonitoringRunStatus, string, string]>(`
  UPDATE monitoring_runs SET status = ?, completed_at = ? WHERE id = ?
`);

const insertAttempt = db.query<AttemptRow, [
  string, string, string, string, MonitoringProvider, string, string, string | null,
  number | null, MentionSentiment | null, number | null, number, string, string, string | null, string,
]>(`
  INSERT INTO monitoring_attempts (
    id, run_id, business_profile_id, monitoring_prompt_id, provider, model, status,
    raw_response, score, mention_sentiment, mention_position, recommended,
    feature_sentiment_json, sources_json, error, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING *
`);

const listAttempts = db.query<AttemptRow, [string]>(`
  SELECT * FROM monitoring_attempts
  WHERE business_profile_id = ?
  ORDER BY created_at ASC
`);

function fromRow(row: AttemptRow): MonitoringAttempt {
  return {
    id: row.id,
    runId: row.run_id,
    businessProfileId: row.business_profile_id,
    monitoringPromptId: row.monitoring_prompt_id,
    provider: row.provider,
    model: row.model,
    status: row.status,
    rawResponse: row.raw_response,
    score: row.score,
    mentionSentiment: row.mention_sentiment,
    mentionPosition: row.mention_position,
    recommended: row.recommended === 1,
    featureSentiment: JSON.parse(row.feature_sentiment_json) as Record<string, MentionSentiment>,
    sources: JSON.parse(row.sources_json) as string[],
    error: row.error,
    createdAt: row.created_at,
  };
}

export const monitoringRuns = {
  start(businessProfileId: string) {
    const id = crypto.randomUUID();
    insertRun.run(id, businessProfileId, "running", new Date().toISOString());
    return id;
  },

  finish(id: string, status: MonitoringRunStatus) {
    finishRun.run(status, new Date().toISOString(), id);
  },

  addAttempt(input: Omit<MonitoringAttempt, "id" | "createdAt">) {
    return fromRow(insertAttempt.get(
      crypto.randomUUID(),
      input.runId,
      input.businessProfileId,
      input.monitoringPromptId,
      input.provider,
      input.model,
      input.status,
      input.rawResponse,
      input.score,
      input.mentionSentiment,
      input.mentionPosition,
      input.recommended ? 1 : 0,
      JSON.stringify(input.featureSentiment),
      JSON.stringify(input.sources),
      input.error,
      new Date().toISOString(),
    )!);
  },

  attempts(businessProfileId: string) {
    return listAttempts.all(businessProfileId).map(fromRow);
  },
};
