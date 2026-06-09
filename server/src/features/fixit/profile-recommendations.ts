import type { BusinessProfile } from "../../db/business-profiles";
import { profileRecommendations } from "../../db/profile-recommendations";
import { buildMonitoringBenchmark } from "../competitive/monitoring-benchmark";

function label(value?: string) {
  return (value ?? "visibility").replaceAll("_", " ");
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
