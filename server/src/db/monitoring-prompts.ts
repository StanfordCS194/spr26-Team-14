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

function fromRow(row: PromptRow): MonitoringPrompt {
  return {
    id: row.id,
    businessProfileId: row.business_profile_id,
    prompt: row.prompt,
    mentionSentiment: row.mention_sentiment,
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
