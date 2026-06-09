import { db } from "./client";
import type { MonitoringAttempt, MonitoringProvider } from "./monitoring-runs";

export type GroundingSeverity = "high" | "medium";
export type GroundingAlertStatus = "open" | "acknowledged";

interface CheckRow {
  id: string; business_profile_id: string; monitoring_attempt_id: string;
  provider: MonitoringProvider; claim_count: number; cited_claim_count: number;
  coverage: number; created_at: string;
}

interface AlertRow {
  id: string; business_profile_id: string; monitoring_attempt_id: string;
  provider: MonitoringProvider; severity: GroundingSeverity; status: GroundingAlertStatus;
  claim_text: string; explanation: string; created_at: string; updated_at: string;
}

const insertCheck = db.query<CheckRow, [string, string, string, MonitoringProvider, number, number, number, string]>(`
  INSERT INTO citation_grounding_checks
    (id, business_profile_id, monitoring_attempt_id, provider, claim_count, cited_claim_count, coverage, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(monitoring_attempt_id) DO UPDATE SET
    claim_count = excluded.claim_count, cited_claim_count = excluded.cited_claim_count, coverage = excluded.coverage
  RETURNING *
`);
const insertAlert = db.query<AlertRow, [
  string, string, string, MonitoringProvider, GroundingSeverity, string, string, string, string,
]>(`
  INSERT INTO citation_grounding_alerts
    (id, business_profile_id, monitoring_attempt_id, provider, severity, status, claim_text, explanation, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)
  ON CONFLICT(monitoring_attempt_id, claim_text) DO UPDATE SET
    severity = excluded.severity, explanation = excluded.explanation, updated_at = excluded.updated_at
  RETURNING *
`);
const listChecks = db.query<CheckRow, [string]>(
  "SELECT * FROM citation_grounding_checks WHERE business_profile_id = ? ORDER BY created_at DESC",
);
const listAlerts = db.query<AlertRow, [string]>(
  "SELECT * FROM citation_grounding_alerts WHERE business_profile_id = ? ORDER BY created_at DESC",
);
const acknowledgeAlert = db.query<AlertRow, [string, string, string]>(`
  UPDATE citation_grounding_alerts SET status = 'acknowledged', updated_at = ?
  WHERE id = ? AND business_profile_id = ? AND status = 'open' RETURNING *
`);

function alertFromRow(row: AlertRow) {
  return {
    id: row.id, businessProfileId: row.business_profile_id, monitoringAttemptId: row.monitoring_attempt_id,
    provider: row.provider, severity: row.severity, status: row.status, claimText: row.claim_text,
    explanation: row.explanation, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export const citationGrounding = {
  record(
    attempt: MonitoringAttempt,
    result: {
      totalClaims: number;
      citedClaims: number;
      coverage: number;
      unsupportedClaims: Array<{ text: string; severity: GroundingSeverity }>;
    },
  ) {
    const now = new Date().toISOString();
    insertCheck.get(
      crypto.randomUUID(), attempt.businessProfileId, attempt.id, attempt.provider,
      result.totalClaims, result.citedClaims, result.coverage, now,
    );
    return result.unsupportedClaims.map((claim) => alertFromRow(insertAlert.get(
      crypto.randomUUID(), attempt.businessProfileId, attempt.id, attempt.provider, claim.severity, claim.text,
      "This factual claim has no citation attached to it in the model response.",
      now, now,
    )!));
  },

  alerts(businessProfileId: string) {
    return listAlerts.all(businessProfileId).map(alertFromRow);
  },

  summary(businessProfileId: string) {
    const checks = listChecks.all(businessProfileId);
    const totalClaims = checks.reduce((sum, check) => sum + check.claim_count, 0);
    const citedClaims = checks.reduce((sum, check) => sum + check.cited_claim_count, 0);
    return { responsesChecked: checks.length, totalClaims, citedClaims, citationCoverage: totalClaims ? citedClaims / totalClaims : 1 };
  },

  acknowledge(businessProfileId: string, id: string) {
    const row = acknowledgeAlert.get(new Date().toISOString(), id, businessProfileId);
    return row ? alertFromRow(row) : null;
  },
};
