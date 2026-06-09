import { accuracyGuard, type BrandFact } from "../../db/accuracy-guard";
import type { MonitoringAttempt } from "../../db/monitoring-runs";

function sentenceContaining(text: string, needle: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .find((sentence) => sentence.toLowerCase().includes(needle.toLowerCase()))
    ?.trim();
}

function severityForFact(fact: BrandFact) {
  if (fact.category === "pricing" || fact.category === "executive") return "high" as const;
  if (fact.category === "feature") return "medium" as const;
  return "low" as const;
}

export function detectInaccuracies(attempt: MonitoringAttempt, facts: BrandFact[]) {
  if (attempt.status !== "success" || !attempt.rawResponse) return [];

  return facts.flatMap((fact) => {
    if (!fact.active) return [];
    const claim = sentenceContaining(attempt.rawResponse!, fact.label);
    if (!claim || claim.toLowerCase().includes(fact.value.toLowerCase())) return [];

    return [accuracyGuard.createAlert({
      businessProfileId: attempt.businessProfileId,
      monitoringAttemptId: attempt.id,
      brandFactId: fact.id,
      severity: severityForFact(fact),
      observedClaim: claim,
      expectedValue: fact.value,
      explanation: `The response discussed "${fact.label}" but did not match the configured ground truth.`,
    })];
  });
}
