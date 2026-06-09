import { store, getNowIso } from "../../db/store";
import type {
  EffortLevel,
  GapEvent,
  ImpactLevel,
  Recommendation,
  RecommendationCategory,
} from "../competitive/types";

function labelFeature(value?: string) {
  return (value ?? "visibility").replaceAll("_", " ");
}

function impactForGap(event: GapEvent): ImpactLevel {
  if (event.confidence >= 0.78) return "high";
  if (event.confidence >= 0.68) return "medium";
  return "low";
}

function categoryForGap(event: GapEvent): RecommendationCategory {
  if (event.gapType === "whitespace") return "content";
  if (event.featureKey === "innovation" || event.featureKey === "reliability") return "earned_media";
  return "technical";
}

function effortForGap(event: GapEvent): EffortLevel {
  if (event.gapType === "whitespace") return "high";
  if (event.confidence >= 0.78) return "medium";
  return "low";
}

function normalizeBrandReferences(text: string) {
  let normalized = text;
  for (const brand of store.brands.values()) {
    normalized = normalized.replaceAll(brand.id, brand.name);
  }
  return normalized
    .replaceAll(/\s*\([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)/gi, "")
    .replaceAll(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "the brand")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function buildRecommendation(event: GapEvent): Recommendation {
  const competitor = event.competitorBrandId ? store.brands.get(event.competitorBrandId)?.name : null;
  const account = store.brands.get(event.brandId)?.name ?? "your brand";
  const feature = labelFeature(event.featureKey ?? event.categoryKey);
  const evidence = normalizeBrandReferences(event.evidence.join(" "));

  const title =
    event.gapType === "whitespace"
      ? `Claim the ${feature} whitespace`
      : competitor
        ? `Close the ${feature} gap vs ${competitor}`
        : `Close the ${feature} perception gap`;

  const action =
    event.gapType === "whitespace"
      ? `Create a canonical ${feature} page and press angle for ${account}, then rerun monitoring to verify AI answers start citing it.`
      : `Publish crawlable proof points that connect ${account} to ${feature}, then pitch third-party coverage that assistants can cite.`;

  return {
    id: crypto.randomUUID(),
    brandId: event.brandId,
    sourceGapEventId: event.id,
    title,
    category: categoryForGap(event),
    impact: impactForGap(event),
    effort: effortForGap(event),
    evidence,
    action,
    createdAt: getNowIso(),
  };
}

export function materializeRecommendationsFromGapEvents(gapEvents: GapEvent[]) {
  const existingGapIds = new Set(store.recommendations.map((rec) => rec.sourceGapEventId));
  const recommendations = gapEvents
    .filter((event) => !existingGapIds.has(event.id))
    .map((event) => buildRecommendation(event));

  store.recommendations.push(...recommendations);
  return recommendations;
}

export function recommendationsForBrand(brandId: string) {
  return store.recommendations
    .filter((rec) => rec.brandId === brandId)
    .map((rec) => ({
      ...rec,
      evidence: normalizeBrandReferences(rec.evidence),
    }))
    .sort((a, b) => a.createdAt < b.createdAt ? 1 : -1);
}
