import { store, getNowIso } from "../../db/store";
import type { GapEvent } from "../competitive/types";

export function publishGapEventsToRecommendationInputs(gapEvents: GapEvent[]) {
  const recommendationInputs = gapEvents.map((event) => ({
    id: crypto.randomUUID(),
    sourceGapEventId: event.id,
    payload: {
      gapType: event.gapType,
      brandId: event.brandId,
      competitorBrandId: event.competitorBrandId,
      promptRunId: event.promptRunId,
      featureKey: event.featureKey,
      categoryKey: event.categoryKey,
      evidence: event.evidence,
      confidence: event.confidence,
      detectedAt: event.detectedAt,
    },
    createdAt: getNowIso(),
  }));

  store.recommendationInputs.push(...recommendationInputs);
  return recommendationInputs;
}
