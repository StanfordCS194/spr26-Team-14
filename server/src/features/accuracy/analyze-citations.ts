import type { MonitoringAttempt } from "../../db/monitoring-runs";
import { citationGrounding, type GroundingSeverity } from "../../db/citation-grounding";
const urlPattern = /https?:\/\/[^\s)\]}>,]+/gi;
function claimText(segment: string) {
  return segment
    .replace(urlPattern, "")
    .replace(/\[[^\]]*]\(\s*\)/g, "")
    .replace(/^[\s#>*-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}
function isClaim(text: string) {
  if (text.length < 12 || text.endsWith("?") || text.endsWith(":")) return false;
  if (/^(sources?|references?|citations?)\b/i.test(text)) return false;
  return /[a-z]/i.test(text);
}
function severity(text: string): GroundingSeverity {
  return /(?:[$€£]\s?\d|\b\d+(?:[.,]\d+)?%?\b|\b(?:19|20)\d{2}\b)/.test(text) ? "high" : "medium";
}
export function analyzeCitationGrounding(response: string) {
  const segments = response
    .split(/\n+|(?<=[.!?])\s+(?=(?:[-*]\s+)?[A-Z0-9])/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const claims = segments.flatMap((segment) => {
    const text = claimText(segment);
    if (!isClaim(text)) return [];
    const citations = [...segment.matchAll(urlPattern)].map((match) => match[0]!.replace(/[.,;:!?]+$/, ""));
    return [{ text, citations }];
  });
  const citedClaims = claims.filter((claim) => claim.citations.length > 0).length;
  return {
    claims,
    totalClaims: claims.length,
    citedClaims,
    coverage: claims.length ? citedClaims / claims.length : 1,
    unsupportedClaims: claims
      .filter((claim) => claim.citations.length === 0)
      .map((claim) => ({ text: claim.text, severity: severity(claim.text) })),
  };
}

export function recordCitationGrounding(attempt: MonitoringAttempt) {
  if (attempt.status !== "success" || !attempt.rawResponse) return null;
  const result = analyzeCitationGrounding(attempt.rawResponse);
  citationGrounding.record(attempt, result);
  return result;
}
