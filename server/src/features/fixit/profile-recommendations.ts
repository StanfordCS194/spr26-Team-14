import type { BusinessProfile } from "../../db/business-profiles";
import { profileRecommendations } from "../../db/profile-recommendations";
import { buildMonitoringBenchmark } from "../competitive/monitoring-benchmark";
import type { GapEvent } from "../competitive/types";

function label(value?: string) {
  return (value ?? "visibility").replaceAll("_", " ");
}

/**
 * Stable identity for a benchmark-derived recommendation so that re-running a
 * benchmark updates the existing row (and preserves its status) instead of
 * piling up duplicates. We intentionally key on the gap's semantic theme
 * (type + competitor + feature/category) rather than the per-run promptRunId,
 * which is regenerated on every run.
 */
function gapThemeKey(gap: GapEvent) {
  return `benchmark:${gap.gapType}:${gap.competitorBrandId ?? ""}:${gap.featureKey ?? gap.categoryKey ?? ""}`;
}

function normalizeEvidence(evidence: string[], brandLabels: Record<string, string>) {
  let text = evidence.join(" ");
  for (const [brandId, name] of Object.entries(brandLabels)) {
    text = text.replaceAll(brandId, name);
  }
  return text;
}

/**
 * Bridges a benchmark run (in-memory competitive pipeline) into the SQLite
 * profile_recommendations table that the Recommendations page reads. Mirrors
 * the gap → recommendation mapping used by syncProfileRecommendations.
 */
export function persistGapEventsToProfileRecommendations(
  businessProfileId: string,
  gapEvents: GapEvent[],
  brandLabels: Record<string, string>,
) {
  for (const gap of gapEvents) {
    const feature = label(gap.featureKey ?? gap.categoryKey);
    const competitor = gap.competitorBrandId ? brandLabels[gap.competitorBrandId] ?? null : null;
    const category = gap.gapType === "whitespace"
      ? "content" as const
      : gap.gapType === "feature_praise_gap"
        ? "earned_media" as const
        : "technical" as const;
    const accountName = brandLabels[gap.brandId] ?? "your brand";
    const title = gap.gapType === "whitespace"
      ? `Claim the ${feature} whitespace`
      : competitor
        ? `Close the ${feature} gap vs ${competitor}`
        : `Close the ${feature} perception gap`;
    const action = gap.gapType === "whitespace"
      ? `Publish a canonical ${feature} resource with statistics, citations, and expert proof points, then rerun the targeted prompts.`
      : `Publish crawlable evidence connecting ${accountName} to ${feature} and pursue third-party coverage that AI assistants can cite.`;

    profileRecommendations.upsert({
      businessProfileId,
      sourceGapEventId: gapThemeKey(gap),
      sourceAttemptId: gap.promptRunId,
      title,
      category,
      impact: gap.confidence >= 0.8 ? "high" : gap.confidence >= 0.65 ? "medium" : "low",
      effort: gap.gapType === "whitespace" ? "high" : "medium",
      evidence: normalizeEvidence(gap.evidence, brandLabels),
      action,
      targetProvider: gap.categoryKey ?? null,
    });
  }
  return profileRecommendations.list(businessProfileId);
}

export function syncProfileRecommendations(profile: BusinessProfile) {
  const benchmark = buildMonitoringBenchmark(profile, 90);
  for (const gap of benchmark.gaps) {
    const feature = label(gap.featureKey ?? gap.categoryKey);
    const competitor = gap.competitorBrandId ? benchmark.brandLabels[gap.competitorBrandId] : null;
    const category = gap.gapType === "whitespace"
      ? "content" as const
      : gap.gapType === "feature_praise_gap"
        ? "earned_media" as const
        : "technical" as const;
    const title = gap.gapType === "whitespace"
      ? `Claim the ${feature} whitespace`
      : competitor
        ? `Close the ${feature} gap vs ${competitor}`
        : `Close the ${feature} perception gap`;
    const action = gap.gapType === "whitespace"
      ? `Publish a canonical ${feature} resource with statistics, citations, and expert proof points, then rerun the targeted prompts.`
      : `Publish crawlable evidence connecting ${profile.name} to ${feature} and pursue third-party coverage that AI assistants can cite.`;

    profileRecommendations.upsert({
      businessProfileId: profile.id,
      sourceGapEventId: gap.id,
      sourceAttemptId: gap.promptRunId,
      title,
      category,
      impact: gap.confidence >= 0.8 ? "high" : gap.confidence >= 0.65 ? "medium" : "low",
      effort: gap.gapType === "whitespace" ? "high" : "medium",
      evidence: gap.evidence.join(" "),
      action,
      targetProvider: gap.categoryKey ?? null,
    });
  }
  return profileRecommendations.list(profile.id);
}
