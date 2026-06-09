import { db } from "./client";

export type FactCategory = "pricing" | "feature" | "executive" | "company" | "custom";
export type AlertSeverity = "high" | "medium" | "low";
export type AlertStatus = "open" | "acknowledged";

export interface BrandFact {
  id: string;
  businessProfileId: string;
  category: FactCategory;
  label: string;
  value: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FactRow {
  id: string;
  business_profile_id: string;
  category: FactCategory;
  label: string;
  value: string;
  active: number;
  created_at: string;
  updated_at: string;
}

interface AlertRow {
  id: string;
  business_profile_id: string;
  monitoring_attempt_id: string;
  brand_fact_id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  observed_claim: string;
  expected_value: string;
  explanation: string;
  created_at: string;
  updated_at: string;
}

const listFacts = db.query<FactRow, [string]>(`
  SELECT * FROM brand_facts WHERE business_profile_id = ? ORDER BY created_at ASC
`);
const getFact = db.query<FactRow, [string, string]>(`
  SELECT * FROM brand_facts WHERE id = ? AND business_profile_id = ?
`);
const insertFact = db.query<FactRow, [string, string, FactCategory, string, string, string, string]>(`
  INSERT INTO brand_facts (id, business_profile_id, category, label, value, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *
`);
const updateFact = db.query<FactRow, [FactCategory, string, string, number, string, string, string]>(`
  UPDATE brand_facts SET category = ?, label = ?, value = ?, active = ?, updated_at = ?
  WHERE id = ? AND business_profile_id = ? RETURNING *
`);
const deleteFact = db.query<null, [string, string]>(`
  DELETE FROM brand_facts WHERE id = ? AND business_profile_id = ?
`);
const insertAlert = db.query<AlertRow, [
  string, string, string, string, AlertSeverity, string, string, string, string, string,
]>(`
  INSERT INTO accuracy_alerts (
    id, business_profile_id, monitoring_attempt_id, brand_fact_id, severity, status,
    observed_claim, expected_value, explanation, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)
  ON CONFLICT(monitoring_attempt_id, brand_fact_id) DO UPDATE SET
    observed_claim = excluded.observed_claim,
    expected_value = excluded.expected_value,
    explanation = excluded.explanation,
    updated_at = excluded.updated_at
  RETURNING *
`);
const listAlerts = db.query<AlertRow, [string]>(`
  SELECT * FROM accuracy_alerts WHERE business_profile_id = ? ORDER BY created_at DESC
`);
const findOpenDuplicate = db.query<AlertRow, [string, string]>(`
  SELECT * FROM accuracy_alerts
  WHERE business_profile_id = ? AND brand_fact_id = ? AND status = 'open'
  ORDER BY created_at DESC LIMIT 1
`);
const acknowledgeAlert = db.query<AlertRow, [string, string, string, string]>(`
  UPDATE accuracy_alerts SET status = 'acknowledged', updated_at = ?
  WHERE id = ? AND business_profile_id = ? AND status = ? RETURNING *
`);

function factFromRow(row: FactRow): BrandFact {
  return {
    id: row.id,
    businessProfileId: row.business_profile_id,
    category: row.category,
    label: row.label,
    value: row.value,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function alertFromRow(row: AlertRow) {
  return {
    id: row.id,
    businessProfileId: row.business_profile_id,
    monitoringAttemptId: row.monitoring_attempt_id,
    brandFactId: row.brand_fact_id,
    severity: row.severity,
    status: row.status,
    observedClaim: row.observed_claim,
    expectedValue: row.expected_value,
    explanation: row.explanation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const accuracyGuard = {
  facts(businessProfileId: string) {
    return listFacts.all(businessProfileId).map(factFromRow);
  },

  fact(businessProfileId: string, id: string) {
    const row = getFact.get(id, businessProfileId);
    return row ? factFromRow(row) : null;
  },

  createFact(businessProfileId: string, input: { category: FactCategory; label: string; value: string }) {
    const now = new Date().toISOString();
    return factFromRow(insertFact.get(
      crypto.randomUUID(), businessProfileId, input.category, input.label, input.value, now, now,
    )!);
  },

  updateFact(
    businessProfileId: string,
    id: string,
    input: { category: FactCategory; label: string; value: string; active: boolean },
  ) {
    const row = updateFact.get(
      input.category, input.label, input.value, input.active ? 1 : 0, new Date().toISOString(), id, businessProfileId,
    );
    return row ? factFromRow(row) : null;
  },

  deleteFact(businessProfileId: string, id: string) {
    deleteFact.run(id, businessProfileId);
  },

  createAlert(input: {
    businessProfileId: string;
    monitoringAttemptId: string;
    brandFactId: string;
    severity: AlertSeverity;
    observedClaim: string;
    expectedValue: string;
    explanation: string;
  }) {
    const duplicate = findOpenDuplicate.get(
      input.businessProfileId,
      input.brandFactId,
    );
    if (duplicate) return alertFromRow(duplicate);

    const now = new Date().toISOString();
    return alertFromRow(insertAlert.get(
      crypto.randomUUID(),
      input.businessProfileId,
      input.monitoringAttemptId,
      input.brandFactId,
      input.severity,
      input.observedClaim,
      input.expectedValue,
      input.explanation,
      now,
      now,
    )!);
  },

  alerts(businessProfileId: string) {
    return listAlerts.all(businessProfileId).map(alertFromRow);
  },

  acknowledge(businessProfileId: string, id: string) {
    const row = acknowledgeAlert.get(new Date().toISOString(), id, businessProfileId, "open");
    return row ? alertFromRow(row) : null;
  },
};
