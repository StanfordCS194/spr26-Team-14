import { db } from "./client";

export type MonitoringStatus = "generating" | "ready" | "error";
export type MentionSentiment = "positive" | "negative" | "neutral";
export type PromptCategory = "comparison" | "recommendation" | "feature" | "pricing" | "custom";
export type PromptCadence = "daily" | "weekly";

export interface MonitoringPrompt {
  id: string;
  businessProfileId: string;
  prompt: string;
  category: PromptCategory;
  cadence: PromptCadence;
  active: boolean;
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
  category: PromptCategory;
  cadence: PromptCadence;
  active: number;
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
    category: row.category,
    cadence: row.cadence,
    active: row.active === 1,
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

const insertPrompt = db.query<PromptRow, [
  string, string, string, PromptCategory, PromptCadence, number, MentionSentiment, string,
]>(`
  INSERT INTO monitoring_prompts (
    id, business_profile_id, prompt, category, cadence, active, mention_sentiment, created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING id, business_profile_id, prompt, category, cadence, active, mention_sentiment, created_at
`);

const deletePrompts = db.query<null, [string]>(`
  DELETE FROM monitoring_prompts
  WHERE business_profile_id = ?
`);

const listPrompts = db.query<PromptRow, [string]>(`
  SELECT id, business_profile_id, prompt, category, cadence, active, mention_sentiment, created_at
  FROM monitoring_prompts
  WHERE business_profile_id = ?
  ORDER BY created_at ASC
`);
const updatePrompt = db.query<PromptRow, [string, PromptCategory, PromptCadence, number, string, string]>(`
  UPDATE monitoring_prompts
  SET prompt = ?, category = ?, cadence = ?, active = ?
  WHERE id = ? AND business_profile_id = ?
  RETURNING id, business_profile_id, prompt, category, cadence, active, mention_sentiment, created_at
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
  add(
    businessProfileId: string,
    input: string | { prompt: string; category?: PromptCategory; cadence?: PromptCadence; active?: boolean },
  ) {
    const values = typeof input === "string" ? { prompt: input } : input;
    return fromRow(insertPrompt.get(
      crypto.randomUUID(),
      businessProfileId,
      values.prompt,
      values.category ?? "custom",
      values.cadence ?? "daily",
      values.active === false ? 0 : 1,
      fakeSentiment(Date.now()),
      new Date().toISOString(),
    )!);
  },

  list(businessProfileId: string, includeInactive = false) {
    const prompts = listPrompts.all(businessProfileId).map(fromRow);
    return includeInactive ? prompts : prompts.filter((prompt) => prompt.active);
  },

  findDuplicate(businessProfileId: string, value: string, excludeId?: string) {
    const tokens = (text: string) => new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));
    const candidate = tokens(value);
    return this.list(businessProfileId, true).find((prompt) => {
      if (prompt.id === excludeId) return false;
      const existing = tokens(prompt.prompt);
      const intersection = [...candidate].filter((token) => existing.has(token)).length;
      const union = new Set([...candidate, ...existing]).size;
      return union > 0 && intersection / union >= 0.85;
    }) ?? null;
  },

  update(
    businessProfileId: string,
    id: string,
    input: { prompt: string; category: PromptCategory; cadence: PromptCadence; active: boolean },
  ) {
    const row = updatePrompt.get(
      input.prompt, input.category, input.cadence, input.active ? 1 : 0, id, businessProfileId,
    );
    return row ? fromRow(row) : null;
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
        insertPrompt.get(
          crypto.randomUUID(), businessProfileId, prompt, "custom", "daily", 1,
          fakeSentiment(index), new Date().toISOString(),
        );
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
