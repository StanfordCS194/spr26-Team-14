import { beforeEach, describe, expect, test } from "bun:test";
import { resetStore, store } from "../../../db/store";
import { buildCompetitiveOverview } from "../benchmark.service";

describe("buildCompetitiveOverview", () => {
  beforeEach(() => {
    resetStore();
  });

  test("aggregates share, sentiment and top features", () => {
    const now = new Date().toISOString();
    store.promptRuns.set("run-1", {
      id: "run-1",
      promptSetId: "set-1",
      prompt: "sample",
      promptKind: "brand_specific",
      model: "gpt-4.1-mini",
      createdAt: now,
    });
    store.comparisons.push({
      promptRunId: "run-1",
      shareOfVoiceByBrand: { b1: 0.6, b2: 0.4 },
      sentimentByBrand: { b1: 0.5, b2: 0.2 },
      praisedFeaturesByBrand: { b1: ["onboarding", "pricing"], b2: ["pricing"] },
      evidence: ["evidence"],
    });

    const result = buildCompetitiveOverview({
      windowStart: new Date(Date.now() - 1000).toISOString(),
      windowEnd: new Date(Date.now() + 1000).toISOString(),
    });

    expect(result.rows).toHaveLength(2);
    const b1 = result.rows.find((row) => row.brandId === "b1");
    expect(b1?.shareOfVoice).toBe(0.6);
    expect(b1?.topFeatures).toContain("pricing");
  });
});
