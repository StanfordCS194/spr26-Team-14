import { beforeEach, describe, expect, test } from "bun:test";
import { resetStore, store } from "../../../db/store";
import { runGapAnalysis } from "../gap-analysis.service";

describe("runGapAnalysis", () => {
  beforeEach(() => {
    resetStore();
  });

  test("emits feature praise gaps when competitor praise lacks account equivalent", () => {
    const now = new Date().toISOString();
    store.answers.set("a1", {
      id: "a1",
      promptRunId: "run-1",
      brandId: "acct",
      answerText: "generic answer",
      createdAt: now,
    });
    store.comparisons.push({
      promptRunId: "run-1",
      shareOfVoiceByBrand: { acct: 0.5, comp: 0.5 },
      sentimentByBrand: { acct: 0.2, comp: 0.5 },
      praisedFeaturesByBrand: { acct: ["support"], comp: ["pricing"] },
      evidence: ["comp praised on pricing"],
    });

    const gaps = runGapAnalysis({ accountBrandId: "acct", promptRunIds: ["run-1"] });
    expect(gaps.some((gap) => gap.gapType === "feature_praise_gap")).toBeTrue();
  });
});
