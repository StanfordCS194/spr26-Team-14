import { db } from "./client";
import { monitoringRuns } from "./monitoring-runs";

export type RecommendationStatus = "proposed" | "planned" | "in_progress" | "completed" | "dismissed";
export type RecommendationCategory = "content" | "earned_media" | "technical";
export type ImpactLevel = "high" | "medium" | "low";
export type EffortLevel = "low" | "medium" | "high";

interface RecommendationRow {
  id: string;
  business_profile_id: string;
  source_gap_event_id: string;
  source_attempt_id: string;
  title: string;
  category: RecommendationCategory;
  impact: ImpactLevel;
  effort: EffortLevel;
  evidence: string;
  action: string;
  target_provider: string | null;
  status: RecommendationStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const insertRecommendation = db.query<RecommendationRow, [
  string, string, string, string, string, RecommendationCategory, ImpactLevel, EffortLevel,
  string, string, string | null, string, string, string,
]>(`
  INSERT INTO profile_recommendations (
    id, business_profile_id, source_gap_event_id, source_attempt_id, title, category,
    impact, effort, evidence, action, target_provider, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(business_profile_id, source_gap_event_id) DO UPDATE SET
    evidence = excluded.evidence,
    updated_at = excluded.updated_at
  RETURNING *
`);
const listRecommendations = db.query<RecommendationRow, [string]>(`
  SELECT * FROM profile_recommendations
  WHERE business_profile_id = ?
  ORDER BY CASE impact WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC
`);
const updateStatus = db.query<RecommendationRow, [
  RecommendationStatus, string | null, string | null, string, string, string,
]>(`
  UPDATE profile_recommendations
  SET status = ?, started_at = ?, completed_at = ?, updated_at = ?
  WHERE id = ? AND business_profile_id = ?
  RETURNING *
`);

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function fromRow(row: RecommendationRow) {
  const allAttempts = monitoringRuns.attempts(row.business_profile_id).filter(
    (attempt) => attempt.status === "success" && attempt.score !== null,
  );
  const sourceAttempt = allAttempts.find((attempt) => attempt.id === row.source_attempt_id);
  const attempts = allAttempts.filter(
    (attempt) =>
      (!sourceAttempt || attempt.monitoringPromptId === sourceAttempt.monitoringPromptId) &&
      (!row.target_provider || attempt.provider === row.target_provider),
  );
  const before = row.completed_at
    ? attempts.filter((attempt) => attempt.createdAt < row.completed_at!).map((attempt) => attempt.score!)
    : [];
  const after = row.completed_at
    ? attempts.filter((attempt) => attempt.createdAt >= row.completed_at!).map((attempt) => attempt.score!)
    : [];
  const beforeScore = average(before);
  const afterScore = average(after);

  return {
    id: row.id,
    businessProfileId: row.business_profile_id,
    brandId: row.business_profile_id,
    sourceGapEventId: row.source_gap_event_id,
    sourceAttemptId: row.source_attempt_id,
    title: row.title,
    category: row.category,
    impact: row.impact,
    effort: row.effort,
    evidence: row.evidence,
    action: row.action,
    targetProvider: row.target_provider,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lift: {
      beforeScore,
      afterScore,
      delta: beforeScore !== null && afterScore !== null ? afterScore - beforeScore : null,
    },
  };
}

export const profileRecommendations = {
  upsert(input: {
    businessProfileId: string;
    sourceGapEventId: string;
    sourceAttemptId: string;
    title: string;
    category: RecommendationCategory;
    impact: ImpactLevel;
    effort: EffortLevel;
    evidence: string;
    action: string;
    targetProvider: string | null;
  }) {
    const now = new Date().toISOString();
    return fromRow(insertRecommendation.get(
      crypto.randomUUID(),
      input.businessProfileId,
      input.sourceGapEventId,
      input.sourceAttemptId,
      input.title,
      input.category,
      input.impact,
      input.effort,
      input.evidence,
      input.action,
      input.targetProvider,
      "proposed",
      now,
      now,
    )!);
  },

  list(businessProfileId: string) {
    return listRecommendations.all(businessProfileId).map(fromRow);
  },

  updateStatus(businessProfileId: string, id: string, status: RecommendationStatus) {
    const existing = listRecommendations.all(businessProfileId).find((row) => row.id === id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const startedAt = status === "in_progress" || status === "completed"
      ? existing.started_at ?? now
      : existing.started_at;
    const completedAt = status === "completed" ? existing.completed_at ?? now : null;
    const row = updateStatus.get(status, startedAt, completedAt, now, id, businessProfileId);
    return row ? fromRow(row) : null;
  },
};
