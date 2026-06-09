import { db } from "./client";

export type MonitoringStatus = "generating" | "ready" | "error";
export type MentionSentiment = "positive" | "negative" | "neutral";

export interface MonitoringPrompt {
  id: string;
  businessProfileId: string;
  prompt: string;
  mentionSentiment: MentionSentiment;
  createdAt: string;
}

export interface MonitoringResult {
  id: string;
  businessProfileId: string;
  monitoringPromptId: string;
  score: number;
  mentionSentiment: MentionSentiment;
  answerSummary: string;
  sources: string[];
  createdAt: string;
}

interface PromptRow {
  id: string;
  business_profile_id: string;
  prompt: string;
  mention_sentiment: MentionSentiment;
  created_at: string;
}

interface StateRow {
  monitoring_status: MonitoringStatus;
  error: string | null;
}

interface ResultRow {
  id: string;
  business_profile_id: string;
  monitoring_prompt_id: string;
  score: number;
  mention_sentiment: MentionSentiment;
  answer_summary: string;
  sources_json: string;
  created_at: string;
}

function fromRow(row: PromptRow): MonitoringPrompt {
  return {
    id: row.id,
    businessProfileId: row.business_profile_id,
    prompt: row.prompt,
    mentionSentiment: row.mention_sentiment,
    createdAt: row.created_at,
  };
}

function resultFromRow(row: ResultRow): MonitoringResult {
  return {
    id: row.id,
    businessProfileId: row.business_profile_id,
    monitoringPromptId: row.monitoring_prompt_id,
    score: row.score,
    mentionSentiment: row.mention_sentiment,
    answerSummary: row.answer_summary,
    sources: JSON.parse(row.sources_json) as string[],
    createdAt: row.created_at,
  };
}

const upsertState = db.query<null, [string, MonitoringStatus, string | null, string]>(`
  INSERT INTO business_setup_state (business_profile_id, monitoring_status, error, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(business_profile_id) DO UPDATE SET
    monitoring_status = excluded.monitoring_status,
    error = excluded.error,
    updated_at = excluded.updated_at
`);

const getState = db.query<StateRow, [string]>(`
  SELECT monitoring_status, error
  FROM business_setup_state
  WHERE business_profile_id = ?
`);

const insertPrompt = db.query<PromptRow, [string, string, string, MentionSentiment, string]>(`
  INSERT INTO monitoring_prompts (id, business_profile_id, prompt, mention_sentiment, created_at)
  VALUES (?, ?, ?, ?, ?)
  RETURNING id, business_profile_id, prompt, mention_sentiment, created_at
`);

const deletePrompts = db.query<null, [string]>(`
  DELETE FROM monitoring_prompts
  WHERE business_profile_id = ?
`);

const listPrompts = db.query<PromptRow, [string]>(`
  SELECT id, business_profile_id, prompt, mention_sentiment, created_at
  FROM monitoring_prompts
  WHERE business_profile_id = ?
  ORDER BY created_at ASC
`);

const updatePromptSentiment = db.query<null, [MentionSentiment, string]>(`
  UPDATE monitoring_prompts
  SET mention_sentiment = ?
  WHERE id = ?
`);

const insertResult = db.query<ResultRow, [string, string, string, number, MentionSentiment, string, string, string]>(`
  INSERT INTO monitoring_results (
    id, business_profile_id, monitoring_prompt_id, score, mention_sentiment, answer_summary, sources_json, created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING id, business_profile_id, monitoring_prompt_id, score, mention_sentiment, answer_summary, sources_json, created_at
`);

const listResults = db.query<ResultRow, [string]>(`
  SELECT id, business_profile_id, monitoring_prompt_id, score, mention_sentiment, answer_summary, sources_json, created_at
  FROM monitoring_results
  WHERE business_profile_id = ?
  ORDER BY created_at ASC
`);

const countResults = db.query<{ count: number }, [string]>(`
  SELECT COUNT(*) as count
  FROM monitoring_results
  WHERE business_profile_id = ?
`);

function fakeSentiment(index: number): MentionSentiment {
  return (["positive", "neutral", "negative"] as const)[index % 3]!;
}

export const monitoringPrompts = {
  add(businessProfileId: string, prompt: string) {
    return fromRow(insertPrompt.get(crypto.randomUUID(), businessProfileId, prompt, fakeSentiment(Date.now()), new Date().toISOString())!);
  },

  list(businessProfileId: string) {
    return listPrompts.all(businessProfileId).map(fromRow);
  },

  addResult(input: {
    businessProfileId: string;
    monitoringPromptId: string;
    score: number;
    mentionSentiment: MentionSentiment;
    answerSummary: string;
    sources: string[];
    createdAt?: string;
  }) {
    const now = input.createdAt ?? new Date().toISOString();
    updatePromptSentiment.run(input.mentionSentiment, input.monitoringPromptId);
    return resultFromRow(
      insertResult.get(
        crypto.randomUUID(),
        input.businessProfileId,
        input.monitoringPromptId,
        input.score,
        input.mentionSentiment,
        input.answerSummary,
        JSON.stringify(input.sources),
        now,
      )!,
    );
  },

  results(businessProfileId: string) {
    return listResults.all(businessProfileId).map(resultFromRow);
  },

  resultCount(businessProfileId: string) {
    return countResults.get(businessProfileId)?.count ?? 0;
  },

  replaceAll(businessProfileId: string, prompts: string[]) {
    db.transaction(() => {
      deletePrompts.run(businessProfileId);
      prompts.forEach((prompt, index) => {
        insertPrompt.get(crypto.randomUUID(), businessProfileId, prompt, fakeSentiment(index), new Date().toISOString());
      });
    })();
    return this.list(businessProfileId);
  },

  setStatus(businessProfileId: string, status: MonitoringStatus, error: string | null = null) {
    upsertState.run(businessProfileId, status, error, new Date().toISOString());
  },

  state(businessProfileId: string) {
    return getState.get(businessProfileId) ?? { monitoring_status: "ready" as const, error: null };
  },
};
