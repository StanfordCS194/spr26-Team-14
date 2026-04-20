import { store } from "../../db/store";
import type { AIAnswer, ComparativeDelta, GapEvent } from "./types";

function findPromptExclusionGaps(input: {
  accountBrandId: string;
  answers: AIAnswer[];
  deltas: ComparativeDelta[];
}): GapEvent[] {
  const accountPromptsMentioned = new Set<string>();
  for (const answer of input.answers) {
    if (answer.brandId === input.accountBrandId) {
      accountPromptsMentioned.add(answer.promptRunId);
    }
  }

  const gaps: GapEvent[] = [];
  for (const delta of input.deltas) {
    if (accountPromptsMentioned.has(delta.promptRunId)) {
      continue;
    }
    for (const [competitorBrandId, share] of Object.entries(delta.shareOfVoiceByBrand)) {
      if (competitorBrandId !== input.accountBrandId && share > 0) {
        gaps.push({
          id: crypto.randomUUID(),
          gapType: "prompt_exclusion",
          brandId: input.accountBrandId,
          competitorBrandId,
          promptRunId: delta.promptRunId,
          evidence: delta.evidence,
          confidence: 0.7,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }
  return gaps;
}

function findFeaturePraiseGaps(input: { accountBrandId: string; deltas: ComparativeDelta[] }): GapEvent[] {
  const gaps: GapEvent[] = [];

  for (const delta of input.deltas) {
    const accountFeatures = new Set(delta.praisedFeaturesByBrand[input.accountBrandId] ?? []);

    for (const [competitorBrandId, features] of Object.entries(delta.praisedFeaturesByBrand)) {
      if (competitorBrandId === input.accountBrandId) {
        continue;
      }
      for (const feature of features) {
        if (!accountFeatures.has(feature)) {
          gaps.push({
            id: crypto.randomUUID(),
            gapType: "feature_praise_gap",
            brandId: input.accountBrandId,
            competitorBrandId,
            promptRunId: delta.promptRunId,
            featureKey: feature,
            evidence: delta.evidence,
            confidence: 0.8,
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return gaps;
}

function findWhitespaceGaps(input: { accountBrandId: string; deltas: ComparativeDelta[] }): GapEvent[] {
  const gaps: GapEvent[] = [];
  for (const delta of input.deltas) {
    const totalShare = Object.values(delta.shareOfVoiceByBrand).reduce((sum, value) => sum + value, 0);
    if (totalShare === 0) {
      gaps.push({
        id: crypto.randomUUID(),
        gapType: "whitespace",
        brandId: input.accountBrandId,
        promptRunId: delta.promptRunId,
        categoryKey: "general",
        evidence: delta.evidence,
        confidence: 0.75,
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return gaps;
}

export function runGapAnalysis(input: { accountBrandId: string; promptRunIds: string[] }): GapEvent[] {
  const answers = Array.from(store.answers.values()).filter((answer) =>
    input.promptRunIds.includes(answer.promptRunId),
  );
  const deltas = store.comparisons.filter((delta) => input.promptRunIds.includes(delta.promptRunId));
  const gapEvents = [
    ...findPromptExclusionGaps({ accountBrandId: input.accountBrandId, answers, deltas }),
    ...findFeaturePraiseGaps({ accountBrandId: input.accountBrandId, deltas }),
    ...findWhitespaceGaps({ accountBrandId: input.accountBrandId, deltas }),
  ];
  store.gapEvents.push(...gapEvents);
  return gapEvents;
}
